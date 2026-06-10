import { json } from '@sveltejs/kit';
import { getRecentArticles, saveArticle, SaveArticleError } from '$lib/server/articles';
import { getAppSettings } from '$lib/server/app-settings';
import { userFromBearer } from '$lib/server/mcp-auth';
import type { RequestHandler } from './$types';
import type { User } from '$lib/server/db/schema';

/** central/family mode: an admin token may write for every account */
async function effectiveScope(user: User): Promise<string | null> {
	const settings = await getAppSettings();
	return settings.mcpGlobal && user.isAdmin ? null : user.id;
}

/** Token-authenticated REST variant of the MCP save_article tool. */
export const POST: RequestHandler = async ({ request }) => {
	const user = await userFromBearer(request);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	try {
		const article = await saveArticle(await effectiveScope(user), {
			categoryId: String(body.category_id ?? ''),
			topicId: body.topic_id ? String(body.topic_id) : null,
			headline: String(body.headline ?? ''),
			summary: String(body.summary ?? ''),
			content: String(body.content ?? ''),
			imageUrl: body.image_url ? String(body.image_url) : null,
			publishedAt: body.published_at ? String(body.published_at) : null,
			sources: Array.isArray(body.sources) ? body.sources : []
		});
		return json(
			{ saved: true, article_id: article.id, image_cached: article.imagePath !== null },
			{ status: 201 }
		);
	} catch (err) {
		if (err instanceof SaveArticleError) return json({ error: err.message }, { status: 400 });
		throw err;
	}
};

export const GET: RequestHandler = async ({ request, url }) => {
	const user = await userFromBearer(request);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
	const days = Math.min(30, Math.max(1, Number(url.searchParams.get('days')) || 3));
	return json({ articles: await getRecentArticles(await effectiveScope(user), days) });
};
