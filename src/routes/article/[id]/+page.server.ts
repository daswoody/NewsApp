import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { articles, categories, chatMessages, sources, topics } from '$lib/server/db/schema';
import { resolveAiSettings } from '$lib/server/app-settings';
import { renderMarkdown } from '$lib/markdown';
import type { Actions, PageServerLoad } from './$types';

async function loadOwnArticle(userId: string, id: string) {
	const article = (
		await db
			.select()
			.from(articles)
			.where(and(eq(articles.id, id), eq(articles.userId, userId)))
			.limit(1)
	)[0];
	if (!article) error(404, 'Artikel nicht gefunden');
	return article;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(303, '/login');
	const article = await loadOwnArticle(locals.user.id, params.id);

	const category = (
		await db.select().from(categories).where(eq(categories.id, article.categoryId)).limit(1)
	)[0];
	const topic = article.topicId
		? (await db.select().from(topics).where(eq(topics.id, article.topicId)).limit(1))[0]
		: null;
	const sourceRows = await db.select().from(sources).where(eq(sources.articleId, article.id));
	const messages = await db
		.select()
		.from(chatMessages)
		.where(eq(chatMessages.articleId, article.id))
		.orderBy(asc(chatMessages.createdAt));
	const ai = await resolveAiSettings(locals.user.id);

	return {
		article: {
			id: article.id,
			headline: article.headline,
			summary: article.summary,
			imagePath: article.imagePath,
			saved: article.saved,
			publishedAt: article.publishedAt,
			hasTopic: article.topicId !== null
		},
		bodyHtml: renderMarkdown(article.content),
		categoryTitle: category?.title ?? '',
		topicTitle: topic?.title ?? null,
		sources: sourceRows.map((s) => ({ id: s.id, name: s.name, url: s.url })),
		messages: messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
		aiConfigured: Boolean(ai.baseUrl && ai.model)
	};
};

export const actions: Actions = {
	toggleSave: async ({ locals, params }) => {
		if (!locals.user) redirect(303, '/login');
		const article = await loadOwnArticle(locals.user.id, params.id);
		await db.update(articles).set({ saved: !article.saved }).where(eq(articles.id, article.id));
		return { saved: !article.saved };
	},

	// Creates a hot topic from this article's subject so future research
	// picks up more news about it, and assigns the article to it.
	makeTopic: async ({ locals, params }) => {
		if (!locals.user) redirect(303, '/login');
		const article = await loadOwnArticle(locals.user.id, params.id);
		if (article.topicId) return fail(400, { error: 'Artikel hat bereits ein Sub-Topic.' });

		const title =
			article.headline.length > 50 ? `${article.headline.slice(0, 47).trimEnd()}…` : article.headline;
		const [topic] = await db
			.insert(topics)
			.values({ categoryId: article.categoryId, title, description: article.summary })
			.returning();
		await db.update(articles).set({ topicId: topic.id }).where(eq(articles.id, article.id));
		return { topicCreated: topic.title };
	}
};
