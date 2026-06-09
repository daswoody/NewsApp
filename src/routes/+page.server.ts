import { fail, redirect } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '$lib/server/db';
import { articles, categories, topics } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, '/login');
	const userId = locals.user.id;

	const savedOnly = url.searchParams.get('saved') === '1';
	const catParam = url.searchParams.get('cat');
	const topicParam = url.searchParams.get('topic');

	const cats = await db
		.select()
		.from(categories)
		.where(eq(categories.userId, userId))
		.orderBy(categories.position, categories.createdAt);

	const selectedCategory = cats.find((c) => c.id === catParam) ?? null;

	const topicRows = selectedCategory
		? await db
				.select()
				.from(topics)
				.where(eq(topics.categoryId, selectedCategory.id))
				.orderBy(topics.createdAt)
		: [];
	const selectedTopic = topicRows.find((t) => t.id === topicParam) ?? null;

	const filters = [eq(articles.userId, userId)];
	if (savedOnly) filters.push(eq(articles.saved, true));
	if (selectedCategory) filters.push(eq(articles.categoryId, selectedCategory.id));
	if (selectedTopic) filters.push(eq(articles.topicId, selectedTopic.id));

	const articleTopic = alias(topics, 'article_topic');
	const rows = await db
		.select({
			id: articles.id,
			headline: articles.headline,
			summary: articles.summary,
			imagePath: articles.imagePath,
			saved: articles.saved,
			publishedAt: articles.publishedAt,
			categoryTitle: categories.title,
			topicTitle: articleTopic.title
		})
		.from(articles)
		.innerJoin(categories, eq(articles.categoryId, categories.id))
		.leftJoin(articleTopic, eq(articles.topicId, articleTopic.id))
		.where(and(...filters))
		.orderBy(desc(articles.publishedAt))
		.limit(300);

	return {
		nickname: locals.user.nickname,
		categories: cats.map((c) => ({ id: c.id, title: c.title })),
		topics: topicRows.map((t) => ({ id: t.id, title: t.title })),
		selectedCategoryId: selectedCategory?.id ?? null,
		selectedTopicId: selectedTopic?.id ?? null,
		savedOnly,
		articles: rows
	};
};

export const actions: Actions = {
	toggleSave: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const article = (
			await db
				.select({ id: articles.id, saved: articles.saved })
				.from(articles)
				.where(and(eq(articles.id, id), eq(articles.userId, locals.user.id)))
				.limit(1)
		)[0];
		if (!article) return fail(404, { error: 'Artikel nicht gefunden.' });
		await db.update(articles).set({ saved: !article.saved }).where(eq(articles.id, article.id));
		return { saved: !article.saved };
	}
};
