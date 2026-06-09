import { fail, redirect } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	aiSettings,
	articles,
	categories,
	mcpTokens,
	topics,
	users
} from '$lib/server/db/schema';
import { sha256 } from '$lib/server/auth';
import { deleteImage } from '$lib/server/images';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, '/login');
	const userId = locals.user.id;

	const cats = await db
		.select()
		.from(categories)
		.where(eq(categories.userId, userId))
		.orderBy(categories.position, categories.createdAt);
	const topicRows =
		cats.length > 0
			? await db
					.select()
					.from(topics)
					.where(
						inArray(
							topics.categoryId,
							cats.map((c) => c.id)
						)
					)
					.orderBy(topics.createdAt)
			: [];
	const ai = (await db.select().from(aiSettings).where(eq(aiSettings.userId, userId)).limit(1))[0];
	const tokens = await db
		.select({
			id: mcpTokens.id,
			label: mcpTokens.label,
			prefix: mcpTokens.prefix,
			createdAt: mcpTokens.createdAt,
			lastUsedAt: mcpTokens.lastUsedAt
		})
		.from(mcpTokens)
		.where(eq(mcpTokens.userId, userId))
		.orderBy(mcpTokens.createdAt);

	return {
		nickname: locals.user.nickname,
		deleteAfterDays: locals.user.deleteAfterDays,
		categories: cats.map((c) => ({
			id: c.id,
			title: c.title,
			description: c.description,
			topics: topicRows
				.filter((t) => t.categoryId === c.id)
				.map((t) => ({ id: t.id, title: t.title, description: t.description }))
		})),
		ai: {
			baseUrl: ai?.baseUrl ?? '',
			model: ai?.model ?? '',
			hasApiKey: Boolean(ai?.apiKey)
		},
		tokens,
		mcpUrl: `${url.origin}/mcp`
	};
};

function requireUser(locals: App.Locals): string {
	if (!locals.user) redirect(303, '/login');
	return locals.user.id;
}

async function ownCategory(userId: string, id: string) {
	return (
		await db
			.select()
			.from(categories)
			.where(and(eq(categories.id, id), eq(categories.userId, userId)))
			.limit(1)
	)[0];
}

async function ownTopic(userId: string, id: string) {
	const rows = await db
		.select({ topic: topics })
		.from(topics)
		.innerJoin(categories, eq(topics.categoryId, categories.id))
		.where(and(eq(topics.id, id), eq(categories.userId, userId)))
		.limit(1);
	return rows[0]?.topic;
}

export const actions: Actions = {
	addCategory: async ({ request, locals }) => {
		const userId = requireUser(locals);
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		if (!title || title.length > 40) {
			return fail(400, { error: 'Bitte einen kurzen Titel angeben (max. 40 Zeichen).' });
		}
		await db.insert(categories).values({ userId, title, description });
		return { ok: true };
	},

	updateCategory: async ({ request, locals }) => {
		const userId = requireUser(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		if (!(await ownCategory(userId, id))) return fail(404, { error: 'Kategorie nicht gefunden.' });
		if (!title || title.length > 40) {
			return fail(400, { error: 'Bitte einen kurzen Titel angeben (max. 40 Zeichen).' });
		}
		await db.update(categories).set({ title, description }).where(eq(categories.id, id));
		return { ok: true };
	},

	deleteCategory: async ({ request, locals }) => {
		const userId = requireUser(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!(await ownCategory(userId, id))) return fail(404, { error: 'Kategorie nicht gefunden.' });
		// DB rows cascade; cached image files have to be removed by hand.
		const imageRows = await db
			.select({ imagePath: articles.imagePath })
			.from(articles)
			.where(eq(articles.categoryId, id));
		await db.delete(categories).where(eq(categories.id, id));
		for (const row of imageRows) await deleteImage(row.imagePath);
		return { ok: true };
	},

	addTopic: async ({ request, locals }) => {
		const userId = requireUser(locals);
		const form = await request.formData();
		const categoryId = String(form.get('categoryId') ?? '');
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		if (!(await ownCategory(userId, categoryId))) {
			return fail(404, { error: 'Kategorie nicht gefunden.' });
		}
		if (!title || title.length > 40) {
			return fail(400, { error: 'Bitte einen kurzen Titel angeben (max. 40 Zeichen).' });
		}
		await db.insert(topics).values({ categoryId, title, description });
		return { ok: true };
	},

	updateTopic: async ({ request, locals }) => {
		const userId = requireUser(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const title = String(form.get('title') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		if (!(await ownTopic(userId, id))) return fail(404, { error: 'Topic nicht gefunden.' });
		if (!title || title.length > 40) {
			return fail(400, { error: 'Bitte einen kurzen Titel angeben (max. 40 Zeichen).' });
		}
		await db.update(topics).set({ title, description }).where(eq(topics.id, id));
		return { ok: true };
	},

	deleteTopic: async ({ request, locals }) => {
		const userId = requireUser(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!(await ownTopic(userId, id))) return fail(404, { error: 'Topic nicht gefunden.' });
		await db.delete(topics).where(eq(topics.id, id));
		return { ok: true };
	},

	setRetention: async ({ request, locals }) => {
		const userId = requireUser(locals);
		const form = await request.formData();
		const days = Number(form.get('days'));
		if (!Number.isInteger(days) || days < 1 || days > 365) {
			return fail(400, { error: 'Bitte eine Zahl zwischen 1 und 365 angeben.' });
		}
		await db.update(users).set({ deleteAfterDays: days }).where(eq(users.id, userId));
		return { ok: true, retentionSaved: true };
	},

	saveAi: async ({ request, locals }) => {
		const userId = requireUser(locals);
		const form = await request.formData();
		const baseUrl = String(form.get('baseUrl') ?? '').trim().replace(/\/+$/, '');
		const model = String(form.get('model') ?? '').trim();
		const apiKey = String(form.get('apiKey') ?? '').trim();
		if (baseUrl && !/^https?:\/\//.test(baseUrl)) {
			return fail(400, { error: 'Die Base-URL muss mit http(s):// beginnen.' });
		}
		const existing = (
			await db.select().from(aiSettings).where(eq(aiSettings.userId, userId)).limit(1)
		)[0];
		// empty key field keeps the stored key so it never has to be re-typed
		const nextKey = apiKey || existing?.apiKey || '';
		await db
			.insert(aiSettings)
			.values({ userId, baseUrl, model, apiKey: nextKey })
			.onConflictDoUpdate({
				target: aiSettings.userId,
				set: { baseUrl, model, apiKey: nextKey }
			});
		return { ok: true, aiSaved: true };
	},

	createToken: async ({ request, locals }) => {
		const userId = requireUser(locals);
		const form = await request.formData();
		const label = String(form.get('label') ?? '').trim() || 'MCP Client';
		const token = `nws_${randomBytes(32).toString('base64url')}`;
		await db.insert(mcpTokens).values({
			userId,
			label,
			tokenHash: sha256(token),
			prefix: token.slice(0, 9)
		});
		// shown exactly once; only the hash is stored
		return { ok: true, newToken: token, newTokenLabel: label };
	},

	deleteToken: async ({ request, locals }) => {
		const userId = requireUser(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		await db.delete(mcpTokens).where(and(eq(mcpTokens.id, id), eq(mcpTokens.userId, userId)));
		return { ok: true };
	}
};
