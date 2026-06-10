import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { articles, users } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';
import { getAppSettings, updateAppSettings } from '$lib/server/app-settings';
import { deleteImage } from '$lib/server/images';
import type { Actions, PageServerLoad } from './$types';

function requireAdmin(locals: App.Locals) {
	if (!locals.user) redirect(303, '/login');
	if (!locals.user.isAdmin) error(403, 'Kein Zugriff – Admin-Rechte erforderlich.');
	return locals.user;
}

export const load: PageServerLoad = async ({ locals }) => {
	const admin = requireAdmin(locals);
	const settings = await getAppSettings();
	const allUsers = await db
		.select({
			id: users.id,
			nickname: users.nickname,
			email: users.email,
			isAdmin: users.isAdmin,
			createdAt: users.createdAt
		})
		.from(users)
		.orderBy(users.createdAt);

	return {
		selfId: admin.id,
		users: allUsers,
		allowRegistration: settings.allowRegistration,
		aiGlobal: settings.aiGlobal,
		mcpGlobal: settings.mcpGlobal,
		globalAi: {
			baseUrl: settings.aiBaseUrl,
			model: settings.aiModel,
			hasApiKey: Boolean(settings.aiApiKey)
		}
	};
};

export const actions: Actions = {
	createUser: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const nickname = String(form.get('nickname') ?? '').trim();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');

		if (!nickname || nickname.length > 60) {
			return fail(400, { error: 'Bitte einen Spitznamen angeben (max. 60 Zeichen).' });
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { error: 'Bitte eine gültige E-Mail-Adresse angeben.' });
		}
		if (password.length < 8) {
			return fail(400, { error: 'Das Passwort muss mindestens 8 Zeichen lang sein.' });
		}
		const existing = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
		if (existing) {
			return fail(400, { error: 'Für diese E-Mail existiert bereits ein Account.' });
		}
		await db.insert(users).values({ nickname, email, passwordHash: await hashPassword(password) });
		return { ok: true, userCreated: nickname };
	},

	deleteUser: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (id === admin.id) {
			return fail(400, { error: 'Du kannst dich nicht selbst löschen – das geht über die Konto-Einstellungen.' });
		}
		const target = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
		if (!target) return fail(404, { error: 'Nutzer nicht gefunden.' });
		const imageRows = await db
			.select({ imagePath: articles.imagePath })
			.from(articles)
			.where(eq(articles.userId, id));
		await db.delete(users).where(eq(users.id, id));
		for (const row of imageRows) await deleteImage(row.imagePath);
		return { ok: true };
	},

	toggleRegistration: async ({ locals }) => {
		requireAdmin(locals);
		const settings = await getAppSettings();
		await updateAppSettings({ allowRegistration: !settings.allowRegistration });
		return { ok: true };
	},

	toggleAiGlobal: async ({ locals }) => {
		requireAdmin(locals);
		const settings = await getAppSettings();
		await updateAppSettings({ aiGlobal: !settings.aiGlobal });
		return { ok: true };
	},

	toggleMcpGlobal: async ({ locals }) => {
		requireAdmin(locals);
		const settings = await getAppSettings();
		await updateAppSettings({ mcpGlobal: !settings.mcpGlobal });
		return { ok: true };
	},

	saveGlobalAi: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const baseUrl = String(form.get('baseUrl') ?? '')
			.trim()
			.replace(/\/+$/, '');
		const model = String(form.get('model') ?? '').trim();
		const apiKey = String(form.get('apiKey') ?? '').trim();
		if (baseUrl && !/^https?:\/\//.test(baseUrl)) {
			return fail(400, { error: 'Die Base-URL muss mit http(s):// beginnen.' });
		}
		const settings = await getAppSettings();
		await updateAppSettings({
			aiBaseUrl: baseUrl,
			aiModel: model,
			// empty key field keeps the stored key
			aiApiKey: apiKey || settings.aiApiKey
		});
		return { ok: true, aiSaved: true };
	}
};
