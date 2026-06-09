import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { createSession, verifyPassword } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/');
	return { allowRegistration: env.ALLOW_REGISTRATION !== 'false' };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { error: 'Bitte E-Mail und Passwort eingeben.', email });
		}

		const user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
		if (!user || !(await verifyPassword(password, user.passwordHash))) {
			return fail(400, { error: 'E-Mail oder Passwort ist falsch.', email });
		}

		await createSession(cookies, user.id);
		redirect(303, '/');
	}
};
