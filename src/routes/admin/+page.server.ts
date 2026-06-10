import { error, fail, redirect } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { and, eq, isNotNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { articles, groups, mcpTokens, users } from '$lib/server/db/schema';
import { hashPassword, sha256 } from '$lib/server/auth';
import { getAppSettings, updateAppSettings } from '$lib/server/app-settings';
import { deleteImage } from '$lib/server/images';
import {
	DEFAULT_DARK,
	DEFAULT_LIGHT,
	isFontId,
	parseTheme,
	parseTypography,
	type ThemeTokens
} from '$lib/theme';
import type { Actions, PageServerLoad } from './$types';

function requireAdmin(locals: App.Locals) {
	if (!locals.user) redirect(303, '/login');
	if (!locals.user.isAdmin) error(403, 'Kein Zugriff – Admin-Rechte erforderlich.');
	return locals.user;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const admin = requireAdmin(locals);
	const settings = await getAppSettings();

	const allUsers = await db
		.select({
			id: users.id,
			nickname: users.nickname,
			email: users.email,
			isAdmin: users.isAdmin,
			groupId: users.groupId,
			createdAt: users.createdAt
		})
		.from(users)
		.orderBy(users.createdAt);

	const allGroups = await db.select().from(groups).orderBy(groups.createdAt);

	const groupTokens = await db
		.select({
			id: mcpTokens.id,
			groupId: mcpTokens.groupId,
			label: mcpTokens.label,
			prefix: mcpTokens.prefix,
			lastUsedAt: mcpTokens.lastUsedAt
		})
		.from(mcpTokens)
		.where(isNotNull(mcpTokens.groupId))
		.orderBy(mcpTokens.createdAt);

	return {
		selfId: admin.id,
		users: allUsers,
		groups: allGroups.map((g) => ({
			id: g.id,
			name: g.name,
			aiBaseUrl: g.aiBaseUrl,
			aiModel: g.aiModel,
			hasApiKey: Boolean(g.aiApiKey),
			members: allUsers.filter((u) => u.groupId === g.id),
			tokens: groupTokens.filter((t) => t.groupId === g.id)
		})),
		allowRegistration: settings.allowRegistration,
		themeLight: parseTheme(settings.themeLight, DEFAULT_LIGHT),
		themeDark: parseTheme(settings.themeDark, DEFAULT_DARK),
		themeCustomized: Boolean(settings.themeLight || settings.themeDark),
		typography: parseTypography({
			headline: settings.fontHeadline,
			headlineStyle: settings.fontHeadlineStyle,
			articleHeadings: settings.fontArticleHeadings,
			articleHeadingsStyle: settings.fontArticleHeadingsStyle,
			body: settings.fontBody
		}),
		showCardSummary: settings.showCardSummary,
		parallaxStrength: settings.parallaxStrength / 100,
		mcpUrl: `${url.origin}/mcp`
	};
};

async function ownGroup(id: string) {
	return (await db.select().from(groups).where(eq(groups.id, id)).limit(1))[0];
}

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

	// ---------- groups ----------

	createGroup: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name || name.length > 60) {
			return fail(400, { error: 'Bitte einen Gruppennamen angeben (max. 60 Zeichen).' });
		}
		await db.insert(groups).values({ name });
		return { ok: true };
	},

	deleteGroup: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		if (!(await ownGroup(id))) return fail(404, { error: 'Gruppe nicht gefunden.' });
		// members fall back to self-managed settings, group tokens are removed
		await db.delete(groups).where(eq(groups.id, id));
		return { ok: true };
	},

	saveGroup: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const group = await ownGroup(id);
		if (!group) return fail(404, { error: 'Gruppe nicht gefunden.' });
		const name = String(form.get('name') ?? '').trim();
		const baseUrl = String(form.get('baseUrl') ?? '')
			.trim()
			.replace(/\/+$/, '');
		const model = String(form.get('model') ?? '').trim();
		const apiKey = String(form.get('apiKey') ?? '').trim();
		if (!name || name.length > 60) {
			return fail(400, { error: 'Bitte einen Gruppennamen angeben (max. 60 Zeichen).' });
		}
		if (baseUrl && !/^https?:\/\//.test(baseUrl)) {
			return fail(400, { error: 'Die Base-URL muss mit http(s):// beginnen.' });
		}
		await db
			.update(groups)
			.set({
				name,
				aiBaseUrl: baseUrl,
				aiModel: model,
				// empty key field keeps the stored key
				aiApiKey: apiKey || group.aiApiKey
			})
			.where(eq(groups.id, id));
		return { ok: true, groupSaved: id };
	},

	setUserGroup: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const userId = String(form.get('userId') ?? '');
		const groupId = String(form.get('groupId') ?? '');
		const target = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
		if (!target) return fail(404, { error: 'Nutzer nicht gefunden.' });
		if (groupId && !(await ownGroup(groupId))) {
			return fail(404, { error: 'Gruppe nicht gefunden.' });
		}
		await db
			.update(users)
			.set({ groupId: groupId || null })
			.where(eq(users.id, userId));
		return { ok: true };
	},

	createGroupToken: async ({ request, locals }) => {
		const admin = requireAdmin(locals);
		const form = await request.formData();
		const groupId = String(form.get('groupId') ?? '');
		const label = String(form.get('label') ?? '').trim() || 'Gruppen-Token';
		if (!(await ownGroup(groupId))) return fail(404, { error: 'Gruppe nicht gefunden.' });
		const token = `nws_${randomBytes(32).toString('base64url')}`;
		await db.insert(mcpTokens).values({
			userId: admin.id,
			groupId,
			label,
			tokenHash: sha256(token),
			prefix: token.slice(0, 9)
		});
		// shown exactly once; only the hash is stored
		return { ok: true, newToken: token, newTokenLabel: label, newTokenGroup: groupId };
	},

	deleteGroupToken: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		await db.delete(mcpTokens).where(and(eq(mcpTokens.id, id), isNotNull(mcpTokens.groupId)));
		return { ok: true };
	},

	// ---------- theme ----------

	saveTheme: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const mode = String(form.get('mode') ?? '');
		if (mode !== 'light' && mode !== 'dark') return fail(400, { error: 'Ungültiger Modus.' });
		const fallback = mode === 'light' ? DEFAULT_LIGHT : DEFAULT_DARK;
		const tokens: ThemeTokens = {
			bg: String(form.get('bg') ?? fallback.bg),
			card: String(form.get('card') ?? fallback.card),
			newsCard: String(form.get('newsCard') ?? fallback.newsCard),
			text: String(form.get('text') ?? fallback.text),
			accent: String(form.get('accent') ?? fallback.accent),
			border: String(form.get('border') ?? fallback.border),
			cardBorder: form.get('cardBorder') === 'on',
			radius: Number(form.get('radius') ?? fallback.radius)
		};
		// parseTheme validates and falls back invalid fields
		const clean = parseTheme(JSON.stringify(tokens), fallback);
		await updateAppSettings(
			mode === 'light'
				? { themeLight: JSON.stringify(clean) }
				: { themeDark: JSON.stringify(clean) }
		);
		return { ok: true, themeSaved: mode };
	},

	resetTheme: async ({ locals }) => {
		requireAdmin(locals);
		await updateAppSettings({
			themeLight: '',
			themeDark: '',
			fontHeadline: '',
			fontHeadlineStyle: '',
			fontArticleHeadings: '',
			fontArticleHeadingsStyle: '',
			fontBody: '',
			parallaxStrength: 35
		});
		return { ok: true };
	},

	saveTypography: async ({ request, locals }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const fontHeadline = String(form.get('headline') ?? '');
		const fontArticleHeadings = String(form.get('articleHeadings') ?? '');
		const fontBody = String(form.get('body') ?? '');
		for (const id of [fontHeadline, fontArticleHeadings, fontBody]) {
			if (id !== '' && !isFontId(id)) return fail(400, { error: 'Unbekannte Schriftart.' });
		}
		const fontHeadlineStyle = String(form.get('headlineStyle') ?? '');
		const fontArticleHeadingsStyle = String(form.get('articleHeadingsStyle') ?? '');
		for (const style of [fontHeadlineStyle, fontArticleHeadingsStyle]) {
			if (style !== '' && !['regular', 'bold', 'italic'].includes(style)) {
				return fail(400, { error: 'Unbekannter Schriftstil.' });
			}
		}
		const parallax = Number(form.get('parallax'));
		await updateAppSettings({
			fontHeadline,
			fontHeadlineStyle,
			fontArticleHeadings,
			fontArticleHeadingsStyle,
			fontBody,
			parallaxStrength: Number.isFinite(parallax)
				? Math.round(Math.min(1, Math.max(0, parallax)) * 100)
				: 35,
			showCardSummary: form.get('showCardSummary') === 'on'
		});
		return { ok: true, typographySaved: true };
	}
};
