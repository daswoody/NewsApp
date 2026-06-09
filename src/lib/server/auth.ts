import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sessions, users } from '$lib/server/db/schema';

const scryptAsync = promisify(scrypt);

const SESSION_COOKIE = 'session';
const SESSION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16).toString('hex');
	const derived = (await scryptAsync(password, salt, 64)) as Buffer;
	return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [salt, hash] = stored.split(':');
	if (!salt || !hash) return false;
	const derived = (await scryptAsync(password, salt, 64)) as Buffer;
	const expected = Buffer.from(hash, 'hex');
	return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export function sha256(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

export async function createSession(cookies: Cookies, userId: string): Promise<void> {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
	await db.insert(sessions).values({ id: sha256(token), userId, expiresAt });
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		expires: expiresAt
	});
}

export async function validateSession(
	cookies: Cookies
): Promise<{ user: typeof users.$inferSelect; sessionId: string } | null> {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;
	const sessionId = sha256(token);
	const rows = await db
		.select({ session: sessions, user: users })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, sessionId))
		.limit(1);
	const row = rows[0];
	if (!row) return null;
	if (row.session.expiresAt < new Date()) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
		return null;
	}
	return { user: row.user, sessionId };
}

export async function destroySession(cookies: Cookies, sessionId: string | null): Promise<void> {
	if (sessionId) await db.delete(sessions).where(eq(sessions.id, sessionId));
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
