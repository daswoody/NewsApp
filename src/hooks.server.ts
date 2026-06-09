import type { Handle, ServerInit } from '@sveltejs/kit';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '$lib/server/db';
import { validateSession } from '$lib/server/auth';
import { startCleanupSchedule } from '$lib/server/cleanup';

export const init: ServerInit = async () => {
	await migrate(db, { migrationsFolder: 'drizzle' });
	startCleanupSchedule();
};

export const handle: Handle = async ({ event, resolve }) => {
	// MCP + token-based REST routes authenticate via Bearer token, not cookies.
	const path = event.url.pathname;
	if (path === '/mcp' || path.startsWith('/api/v1/')) {
		event.locals.user = null;
		event.locals.sessionId = null;
		return resolve(event);
	}

	const session = await validateSession(event.cookies);
	event.locals.user = session?.user ?? null;
	event.locals.sessionId = session?.sessionId ?? null;
	return resolve(event);
};
