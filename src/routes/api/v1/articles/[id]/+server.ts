import { json } from '@sveltejs/kit';
import { updateArticle, SaveArticleError } from '$lib/server/articles';
import { scopeFromBearer } from '$lib/server/mcp-auth';
import type { RequestHandler } from './$types';

/** Token-authenticated REST variant of the MCP update_article tool. */
export const PATCH: RequestHandler = async ({ request, params }) => {
	const scope = await scopeFromBearer(request);
	if (!scope) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	try {
		const { article, imageError } = await updateArticle(scope, {
			articleId: params.id,
			headline: body.headline ? String(body.headline) : null,
			summary: body.summary ? String(body.summary) : null,
			content: body.content ? String(body.content) : null,
			imageUrl: body.image_url ? String(body.image_url) : null,
			topicId: body.topic_id !== undefined ? String(body.topic_id) : null,
			publishedAt: body.published_at ? String(body.published_at) : null,
			sources: Array.isArray(body.sources) ? body.sources : null
		});
		return json({
			updated: true,
			article_id: article.id,
			image_cached: article.imagePath !== null,
			...(imageError ? { image_error: imageError } : {})
		});
	} catch (err) {
		if (err instanceof SaveArticleError) return json({ error: err.message }, { status: 400 });
		throw err;
	}
};
