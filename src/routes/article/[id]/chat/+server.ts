import { error, json } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { articles, chatMessages, sources } from '$lib/server/db/schema';
import { resolveAiSettings } from '$lib/server/app-settings';
import type { RequestHandler } from './$types';

const MAX_HISTORY = 20;

function buildSystemPrompt(
	article: { headline: string; summary: string; content: string },
	sourceRows: { name: string; url: string }[]
) {
	const sourceList =
		sourceRows.map((s) => `- ${s.name}: ${s.url}`).join('\n') || '- (keine Quellen hinterlegt)';
	return [
		'Du bist ein hilfreicher News-Assistent. Der Nutzer liest gerade den folgenden Artikel und stellt dir Rückfragen dazu.',
		'Beantworte Fragen präzise auf Basis des Artikels und der Quellen. Wenn etwas nicht im Artikel steht, sage das ehrlich und ordne es ein. Antworte in der Sprache des Nutzers.',
		'',
		`# ${article.headline}`,
		'',
		article.content,
		'',
		'## Quellen',
		sourceList
	].join('\n');
}

/** Streams the answer of the user's OpenAI-compatible model as plain text. */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) error(401, 'Nicht angemeldet');
	const userId = locals.user.id;

	const article = (
		await db
			.select()
			.from(articles)
			.where(and(eq(articles.id, params.id), eq(articles.userId, userId)))
			.limit(1)
	)[0];
	if (!article) error(404, 'Artikel nicht gefunden');

	const body = await request.json().catch(() => ({}));
	const question = String(body.question ?? '').trim();
	if (!question || question.length > 4000) error(400, 'Ungültige Frage');

	const ai = await resolveAiSettings(userId);
	if (!ai.baseUrl || !ai.model) {
		return json(
			{ error: 'Keine KI verbunden. Hinterlege Base-URL und Modell in den Einstellungen.' },
			{ status: 400 }
		);
	}

	const sourceRows = await db.select().from(sources).where(eq(sources.articleId, article.id));
	const history = await db
		.select()
		.from(chatMessages)
		.where(eq(chatMessages.articleId, article.id))
		.orderBy(asc(chatMessages.createdAt));

	const messages = [
		{ role: 'system', content: buildSystemPrompt(article, sourceRows) },
		...history.slice(-MAX_HISTORY).map((m) => ({ role: m.role, content: m.content })),
		{ role: 'user', content: question }
	];

	const endpoint = `${ai.baseUrl.replace(/\/+$/, '')}/chat/completions`;
	let upstream: Response;
	try {
		upstream = await fetch(endpoint, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				...(ai.apiKey ? { authorization: `Bearer ${ai.apiKey}` } : {})
			},
			body: JSON.stringify({ model: ai.model, messages, stream: true }),
			signal: AbortSignal.timeout(120_000)
		});
	} catch {
		return json({ error: 'Die KI ist nicht erreichbar. Prüfe die Base-URL.' }, { status: 502 });
	}

	if (!upstream.ok || !upstream.body) {
		const detail = (await upstream.text().catch(() => '')).slice(0, 300);
		return json(
			{ error: `KI-Anfrage fehlgeschlagen (${upstream.status}). ${detail}` },
			{ status: 502 }
		);
	}

	await db.insert(chatMessages).values({ articleId: article.id, role: 'user', content: question });

	// Re-emit the OpenAI SSE stream as a plain text stream and persist the
	// full answer once the stream ends.
	const upstreamBody = upstream.body;
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const encoder = new TextEncoder();
			const decoder = new TextDecoder();
			const reader = upstreamBody.getReader();
			let buffer = '';
			let answer = '';
			try {
				for (;;) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() ?? '';
					for (const line of lines) {
						const data = line.trim();
						if (!data.startsWith('data:')) continue;
						const payload = data.slice(5).trim();
						if (payload === '[DONE]') continue;
						try {
							const parsed = JSON.parse(payload);
							const delta: string = parsed.choices?.[0]?.delta?.content ?? '';
							if (delta) {
								answer += delta;
								controller.enqueue(encoder.encode(delta));
							}
						} catch {
							// ignore malformed chunks
						}
					}
				}
			} finally {
				if (answer.trim()) {
					await db
						.insert(chatMessages)
						.values({ articleId: article.id, role: 'assistant', content: answer })
						.catch(() => {});
				}
				controller.close();
			}
		},
		cancel() {
			upstreamBody.cancel().catch(() => {});
		}
	});

	return new Response(stream, {
		headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
	});
};
