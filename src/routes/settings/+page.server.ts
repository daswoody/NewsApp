import { fail, redirect } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	aiSettings,
	articles,
	categories,
	groups,
	mcpTokens,
	topics,
	users
} from '$lib/server/db/schema';
import { destroySession, hashPassword, sha256, verifyPassword } from '$lib/server/auth';
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
					.orderBy(topics.position, topics.createdAt)
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
		.where(and(eq(mcpTokens.userId, userId), isNull(mcpTokens.groupId)))
		.orderBy(mcpTokens.createdAt);

	const group = locals.user.groupId
		? (await db.select().from(groups).where(eq(groups.id, locals.user.groupId)).limit(1))[0]
		: undefined;

	return {
		nickname: locals.user.nickname,
		email: locals.user.email,
		isAdmin: locals.user.isAdmin,
		deleteAfterDays: locals.user.deleteAfterDays,
		groupName: group?.name ?? null,
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

	moveCategory: async ({ request, locals }) => {
		const userId = requireUser(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const dir = String(form.get('dir') ?? '') === 'up' ? -1 : 1;
		const ordered = await db
			.select({ id: categories.id })
			.from(categories)
			.where(eq(categories.userId, userId))
			.orderBy(categories.position, categories.createdAt);
		const index = ordered.findIndex((c) => c.id === id);
		if (index === -1) return fail(404, { error: 'Kategorie nicht gefunden.' });
		const target = index + dir;
		if (target < 0 || target >= ordered.length) return { ok: true };
		[ordered[index], ordered[target]] = [ordered[target], ordered[index]];
		for (let i = 0; i < ordered.length; i++) {
			await db.update(categories).set({ position: i }).where(eq(categories.id, ordered[i].id));
		}
		return { ok: true };
	},

	moveTopic: async ({ request, locals }) => {
		const userId = requireUser(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const dir = String(form.get('dir') ?? '') === 'up' ? -1 : 1;
		const topic = await ownTopic(userId, id);
		if (!topic) return fail(404, { error: 'Topic nicht gefunden.' });
		const ordered = await db
			.select({ id: topics.id })
			.from(topics)
			.where(eq(topics.categoryId, topic.categoryId))
			.orderBy(topics.position, topics.createdAt);
		const index = ordered.findIndex((t) => t.id === id);
		const target = index + dir;
		if (target < 0 || target >= ordered.length) return { ok: true };
		[ordered[index], ordered[target]] = [ordered[target], ordered[index]];
		for (let i = 0; i < ordered.length; i++) {
			await db.update(topics).set({ position: i }).where(eq(topics.id, ordered[i].id));
		}
		return { ok: true };
	},

	updateProfile: async ({ request, locals }) => {
		const userId = requireUser(locals);
		const form = await request.formData();
		const nickname = String(form.get('nickname') ?? '').trim();
		if (!nickname || nickname.length > 60) {
			return fail(400, { error: 'Bitte einen Spitznamen angeben (max. 60 Zeichen).' });
		}
		await db.update(users).set({ nickname }).where(eq(users.id, userId));
		return { ok: true, profileSaved: true };
	},

	changePassword: async ({ request, locals }) => {
		const userId = requireUser(locals);
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		if (next.length < 8) {
			return fail(400, { error: 'Das neue Passwort muss mindestens 8 Zeichen lang sein.' });
		}
		const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
		if (!user || !(await verifyPassword(current, user.passwordHash))) {
			return fail(400, { error: 'Das aktuelle Passwort ist falsch.' });
		}
		await db
			.update(users)
			.set({ passwordHash: await hashPassword(next) })
			.where(eq(users.id, userId));
		return { ok: true, passwordSaved: true };
	},

	deleteAccount: async ({ request, locals, cookies }) => {
		const userId = requireUser(locals);
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
		if (!user || !(await verifyPassword(password, user.passwordHash))) {
			return fail(400, { error: 'Das Passwort ist falsch – Account wurde nicht gelöscht.' });
		}
		if (user.isAdmin) {
			const admins = await db.$count(users, eq(users.isAdmin, true));
			const total = await db.$count(users);
			if (admins === 1 && total > 1) {
				return fail(400, {
					error: 'Du bist der einzige Admin. Lösche zuerst die anderen Accounts oder ernenne im Admin-Panel keinen Ersatz – der letzte Admin kann nicht vor den übrigen Nutzern gehen.'
				});
			}
		}
		const imageRows = await db
			.select({ imagePath: articles.imagePath })
			.from(articles)
			.where(eq(articles.userId, userId));
		await db.delete(users).where(eq(users.id, userId));
		for (const row of imageRows) await deleteImage(row.imagePath);
		await destroySession(cookies, locals.sessionId);
		redirect(303, '/login');
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
		if (locals.user!.groupId) {
			return fail(403, { error: 'Die KI-Verbindung wird von deiner Gruppe verwaltet.' });
		}
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
		if (locals.user!.groupId) {
			return fail(403, { error: 'MCP-Tokens werden von deiner Gruppe verwaltet.' });
		}
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
