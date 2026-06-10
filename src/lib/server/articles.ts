import { and, desc, eq, gte, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { articles, categories, sources, topics, users } from '$lib/server/db/schema';
import { cacheImage, deleteImage } from '$lib/server/images';
import type { TokenScope } from '$lib/server/mcp-auth';

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
 * The article is assigned to whoever owns the category; the token scope
 * limits which categories are writable (own account or group members).
 */
export async function saveArticle(scope: TokenScope, input: SaveArticleInput) {
	const headline = input.headline?.trim();
	const summary = input.summary?.trim();
	const content = input.content?.trim();
	if (!headline || !summary || !content) {
		throw new SaveArticleError('headline, summary and content are required');
	}

	const category = (
		await db.select().from(categories).where(eq(categories.id, input.categoryId)).limit(1)
	)[0];
	if (!category) throw new SaveArticleError(`Unknown category_id: ${input.categoryId}`);

	if (scope.kind === 'user') {
		if (category.userId !== scope.userId) {
			throw new SaveArticleError(`Unknown category_id: ${input.categoryId}`);
		}
	} else {
		const owner = (
			await db.select().from(users).where(eq(users.id, category.userId)).limit(1)
		)[0];
		if (!owner || owner.groupId !== scope.groupId) {
			throw new SaveArticleError(`Unknown category_id: ${input.categoryId}`);
		}
	}

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

	const cached = input.imageUrl ? await cacheImage(input.imageUrl) : null;
	const imagePath = cached?.name ?? null;

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

	return { article, imageError: cached?.error ?? null };
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

export interface UpdateArticleInput {
	articleId: string;
	headline?: string | null;
	summary?: string | null;
	content?: string | null;
	imageUrl?: string | null;
	topicId?: string | null; // '' clears the topic
	publishedAt?: string | null;
	sources?: { name: string; url: string }[] | null;
}

async function inScope(scope: TokenScope, ownerId: string): Promise<boolean> {
	if (scope.kind === 'user') return ownerId === scope.userId;
	const owner = (await db.select().from(users).where(eq(users.id, ownerId)).limit(1))[0];
	return Boolean(owner && owner.groupId === scope.groupId);
}

/**
 * Updates an existing article. Only provided fields change; a provided
 * sources array replaces the stored list, a new image replaces the cached
 * file (kept untouched when the download fails).
 */
export async function updateArticle(scope: TokenScope, input: UpdateArticleInput) {
	const article = (
		await db.select().from(articles).where(eq(articles.id, input.articleId)).limit(1)
	)[0];
	if (!article || !(await inScope(scope, article.userId))) {
		throw new SaveArticleError(`Unknown article_id: ${input.articleId}`);
	}

	const updates: Partial<typeof articles.$inferInsert> = {};

	if (input.headline?.trim()) updates.headline = input.headline.trim();
	if (input.summary?.trim()) updates.summary = input.summary.trim();
	if (input.content?.trim()) updates.content = input.content.trim();

	if (input.publishedAt) {
		const parsed = new Date(input.publishedAt);
		if (!Number.isNaN(parsed.getTime())) updates.publishedAt = parsed;
	}

	if (input.topicId !== undefined && input.topicId !== null) {
		if (input.topicId === '') {
			updates.topicId = null;
		} else {
			const topic = (
				await db
					.select()
					.from(topics)
					.where(and(eq(topics.id, input.topicId), eq(topics.categoryId, article.categoryId)))
					.limit(1)
			)[0];
			if (!topic) {
				throw new SaveArticleError(`Unknown topic_id for this category: ${input.topicId}`);
			}
			updates.topicId = topic.id;
		}
	}

	let imageError: string | null = null;
	if (input.imageUrl) {
		const cached = await cacheImage(input.imageUrl);
		if (cached.name) {
			await deleteImage(article.imagePath);
			updates.imagePath = cached.name;
		} else {
			imageError = cached.error ?? 'image download failed';
		}
	}

	let updated = article;
	if (Object.keys(updates).length > 0) {
		[updated] = await db
			.update(articles)
			.set(updates)
			.where(eq(articles.id, article.id))
			.returning();
	}

	if (Array.isArray(input.sources)) {
		await db.delete(sources).where(eq(sources.articleId, article.id));
		const sourceRows = input.sources
			.filter((s) => s?.name?.trim() && s?.url?.trim())
			.map((s) => ({ articleId: article.id, name: s.name.trim(), url: s.url.trim() }));
		if (sourceRows.length > 0) await db.insert(sources).values(sourceRows);
	}

	return { article: updated, imageError };
}

/** Interests of every group member, for group MCP tokens. */
export async function getInterestsForGroup(groupId: string) {
	const members = await db
		.select({ id: users.id, nickname: users.nickname })
		.from(users)
		.where(eq(users.groupId, groupId))
		.orderBy(users.createdAt);
	const result = [];
	for (const member of members) {
		result.push({
			user_id: member.id,
			nickname: member.nickname,
			categories: await getInterests(member.id)
		});
	}
	return result;
}

/** Recent headlines so the AI can avoid storing duplicates. */
export async function getRecentArticles(scope: TokenScope, days: number) {
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
	let userFilter;
	if (scope.kind === 'user') {
		userFilter = eq(articles.userId, scope.userId);
	} else {
		const members = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.groupId, scope.groupId));
		if (members.length === 0) return [];
		userFilter = inArray(
			articles.userId,
			members.map((m) => m.id)
		);
	}
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
		.where(and(userFilter, gte(articles.publishedAt, since)))
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
