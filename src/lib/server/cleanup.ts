import { and, eq, inArray, lt } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { articles, sessions, users } from '$lib/server/db/schema';
import { deleteImage } from '$lib/server/images';

const HARD_LIMIT_DAYS = 365;

async function deleteArticleRows(rows: { id: string; imagePath: string | null }[]) {
	if (rows.length === 0) return 0;
	for (const row of rows) await deleteImage(row.imagePath);
	await db.delete(articles).where(
		inArray(
			articles.id,
			rows.map((r) => r.id)
		)
	);
	return rows.length;
}

/**
 * Retention rules:
 *  - per user: articles older than `deleteAfterDays` are removed, saved ones are kept
 *  - hard cap: everything older than 12 months is removed, saved or not
 */
export async function runCleanup(): Promise<void> {
	try {
		let deleted = 0;

		const allUsers = await db
			.select({ id: users.id, deleteAfterDays: users.deleteAfterDays })
			.from(users);
		for (const user of allUsers) {
			const cutoff = new Date(Date.now() - user.deleteAfterDays * 24 * 60 * 60 * 1000);
			const rows = await db
				.select({ id: articles.id, imagePath: articles.imagePath })
				.from(articles)
				.where(
					and(
						eq(articles.userId, user.id),
						eq(articles.saved, false),
						lt(articles.publishedAt, cutoff)
					)
				);
			deleted += await deleteArticleRows(rows);
		}

		const hardCutoff = new Date(Date.now() - HARD_LIMIT_DAYS * 24 * 60 * 60 * 1000);
		const oldRows = await db
			.select({ id: articles.id, imagePath: articles.imagePath })
			.from(articles)
			.where(lt(articles.publishedAt, hardCutoff));
		deleted += await deleteArticleRows(oldRows);

		await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

		if (deleted > 0) console.log(`[cleanup] removed ${deleted} expired article(s)`);
	} catch (err) {
		console.error('[cleanup] failed', err);
	}
}

let timer: ReturnType<typeof setInterval> | undefined;

export function startCleanupSchedule(): void {
	if (timer) return;
	timer = setInterval(runCleanup, 60 * 60 * 1000);
	// run once shortly after boot, without delaying startup
	setTimeout(runCleanup, 10_000);
}
