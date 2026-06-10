import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import {
	aiSettings,
	appSettings,
	groups,
	users,
	type AppSettings,
	type User
} from '$lib/server/db/schema';

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
 * AI connection used for article chat: group members use the group's
 * connection (managed by the admin), everyone else their own settings.
 */
export async function resolveAiSettings(
	user: Pick<User, 'id' | 'groupId'>
): Promise<{ baseUrl: string; apiKey: string; model: string; groupName: string | null }> {
	if (user.groupId) {
		const group = (await db.select().from(groups).where(eq(groups.id, user.groupId)).limit(1))[0];
		if (group) {
			return {
				baseUrl: group.aiBaseUrl,
				apiKey: group.aiApiKey,
				model: group.aiModel,
				groupName: group.name
			};
		}
	}
	const own = (
		await db.select().from(aiSettings).where(eq(aiSettings.userId, user.id)).limit(1)
	)[0];
	return {
		baseUrl: own?.baseUrl ?? '',
		apiKey: own?.apiKey ?? '',
		model: own?.model ?? '',
		groupName: null
	};
}
