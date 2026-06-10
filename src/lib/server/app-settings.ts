import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { aiSettings, appSettings, users, type AppSettings } from '$lib/server/db/schema';

/** Loads the single settings row, creating it on first access. */
export async function getAppSettings(): Promise<AppSettings> {
	const existing = (await db.select().from(appSettings).limit(1))[0];
	if (existing) return existing;
	const [created] = await db
		.insert(appSettings)
		.values({ id: 1, allowRegistration: env.ALLOW_REGISTRATION !== 'false' })
		.onConflictDoNothing()
		.returning();
	return created ?? (await db.select().from(appSettings).limit(1))[0];
}

export async function updateAppSettings(values: Partial<Omit<AppSettings, 'id'>>): Promise<void> {
	await getAppSettings();
	await db.update(appSettings).set(values).where(eq(appSettings.id, 1));
}

export async function registrationAllowed(): Promise<boolean> {
	const userCount = await db.$count(users);
	if (userCount === 0) return true; // the first account (the admin) must always be creatable
	return (await getAppSettings()).allowRegistration;
}

/**
 * AI connection used for article chat: the per-user config, or the
 * admin-managed global one when the admin switched AI settings to global.
 */
export async function resolveAiSettings(
	userId: string
): Promise<{ baseUrl: string; apiKey: string; model: string; global: boolean }> {
	const settings = await getAppSettings();
	if (settings.aiGlobal) {
		return {
			baseUrl: settings.aiBaseUrl,
			apiKey: settings.aiApiKey,
			model: settings.aiModel,
			global: true
		};
	}
	const own = (await db.select().from(aiSettings).where(eq(aiSettings.userId, userId)).limit(1))[0];
	return {
		baseUrl: own?.baseUrl ?? '',
		apiKey: own?.apiKey ?? '',
		model: own?.model ?? '',
		global: false
	};
}
