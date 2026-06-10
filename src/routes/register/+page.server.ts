import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { createSession, hashPassword } from '$lib/server/auth';
import { registrationAllowed } from '$lib/server/app-settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/');
	if (!(await registrationAllowed())) redirect(303, '/login');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		if (!(await registrationAllowed())) {
			return fail(403, { error: 'Die Registrierung ist derzeit deaktiviert.', nickname: '', email: '' });
		}

		const form = await request.formData();
		const nickname = String(form.get('nickname') ?? '').trim();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');

		if (!nickname || nickname.length > 60) {
			return fail(400, { error: 'Bitte einen Spitznamen angeben (max. 60 Zeichen).', nickname, email });
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { error: 'Bitte eine gültige E-Mail-Adresse angeben.', nickname, email });
		}
		if (password.length < 8) {
			return fail(400, { error: 'Das Passwort muss mindestens 8 Zeichen lang sein.', nickname, email });
		}

		const existing = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
		if (existing) {
			return fail(400, { error: 'Für diese E-Mail existiert bereits ein Account.', nickname, email });
		}

		// the very first account becomes the admin
		const isAdmin = (await db.$count(users)) === 0;
		const [user] = await db
			.insert(users)
			.values({ nickname, email, passwordHash: await hashPassword(password), isAdmin })
			.returning();

		await createSession(cookies, user.id);
		redirect(303, '/');
	}
};
