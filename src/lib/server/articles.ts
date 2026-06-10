import { and, desc, eq, gte } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { articles, categories, sources, topics, users } from '$lib/server/db/schema';
import { cacheImage } from '$lib/server/images';

export interface SaveArticleInput {
	categoryId: string;
	topicId?: string | null;
	headline: string;
	summary: string;
	content: string;
	imageUrl?: string | null;
	sources: { name: string; url: string }[];
	publishedAt?: string | null;
}

export class SaveArticleError extends Error {}

/**
 * Shared write path used by the MCP tool and the REST endpoint.
 * Validates that category/topic belong to the given user, caches the
 * image locally and stores article + sources. With userId = null
 * (central/family mode) the article is assigned to whoever owns the
 * category, so one admin token can research for every account.
 */
export async function saveArticle(userId: string | null, input: SaveArticleInput) {
	const headline = input.headline?.trim();
	const summary = input.summary?.trim();
	const content = input.content?.trim();
	if (!headline || !summary || !content) {
		throw new SaveArticleError('headline, summary and content are required');
	}

	const categoryFilter = userId
		? and(eq(categories.id, input.categoryId), eq(categories.userId, userId))
		: eq(categories.id, input.categoryId);
	const category = (
		await db.select().from(categories).where(categoryFilter).limit(1)
	)[0];
	if (!category) throw new SaveArticleError(`Unknown category_id: ${input.categoryId}`);

	let topicId: string | null = null;
	if (input.topicId) {
		const topic = (
			await db
				.select()
				.from(topics)
				.where(and(eq(topics.id, input.topicId), eq(topics.categoryId, category.id)))
				.limit(1)
		)[0];
		if (!topic) {
			throw new SaveArticleError(`Unknown topic_id for this category: ${input.topicId}`);
		}
		topicId = topic.id;
	}

	const imagePath = input.imageUrl ? await cacheImage(input.imageUrl) : null;

	let publishedAt = new Date();
	if (input.publishedAt) {
		const parsed = new Date(input.publishedAt);
		if (!Number.isNaN(parsed.getTime())) publishedAt = parsed;
	}

	const [article] = await db
		.insert(articles)
		.values({
			userId: category.userId,
			categoryId: category.id,
			topicId,
			headline,
			summary,
			content,
			imagePath,
			publishedAt
		})
		.returning();

	const sourceRows = (input.sources ?? [])
		.filter((s) => s?.name?.trim() && s?.url?.trim())
		.map((s) => ({ articleId: article.id, name: s.name.trim(), url: s.url.trim() }));
	if (sourceRows.length > 0) {
		await db.insert(sources).values(sourceRows);
	}

	return article;
}

/** Categories + topics in the shape handed to the AI via MCP/REST. */
export async function getInterests(userId: string) {
	const cats = await db
		.select()
		.from(categories)
		.where(eq(categories.userId, userId))
		.orderBy(categories.position, categories.createdAt);
	const allTopics = await db
		.select({ topic: topics })
		.from(topics)
		.innerJoin(categories, eq(topics.categoryId, categories.id))
		.where(eq(categories.userId, userId))
		.orderBy(topics.position, topics.createdAt);
	return cats.map((c) => ({
		category_id: c.id,
		title: c.title,
		description: c.description,
		hot_topics: allTopics
			.filter((t) => t.topic.categoryId === c.id)
			.map((t) => ({ topic_id: t.topic.id, title: t.topic.title, description: t.topic.description }))
	}));
}

/** Interests of every account, for the central/family MCP mode. */
export async function getInterestsForAllUsers() {
	const allUsers = await db
		.select({ id: users.id, nickname: users.nickname })
		.from(users)
		.orderBy(users.createdAt);
	const result = [];
	for (const user of allUsers) {
		result.push({
			user_id: user.id,
			nickname: user.nickname,
			categories: await getInterests(user.id)
		});
	}
	return result;
}

/**
 * Recent headlines so the AI can avoid storing duplicates.
 * userId = null returns the articles of every account (central mode).
 */
export async function getRecentArticles(userId: string | null, days: number) {
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
	const filter = userId
		? and(eq(articles.userId, userId), gte(articles.publishedAt, since))
		: gte(articles.publishedAt, since);
	const rows = await db
		.select({
			id: articles.id,
			headline: articles.headline,
			userId: articles.userId,
			categoryId: articles.categoryId,
			topicId: articles.topicId,
			publishedAt: articles.publishedAt
		})
		.from(articles)
		.where(filter)
		.orderBy(desc(articles.publishedAt));
	return rows.map((r) => ({
		article_id: r.id,
		headline: r.headline,
		user_id: r.userId,
		category_id: r.categoryId,
		topic_id: r.topicId,
		published_at: r.publishedAt.toISOString()
	}));
}
