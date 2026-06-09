import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { mcpTokens, users, type User } from '$lib/server/db/schema';
import { sha256 } from '$lib/server/auth';

/** Resolves a raw MCP token (from header or secret URL path) to its user. */
export async function userFromToken(raw: string): Promise<User | null> {
	if (!raw) return null;
	const tokenHash = sha256(raw.trim());
	const rows = await db
		.select({ token: mcpTokens, user: users })
		.from(mcpTokens)
		.innerJoin(users, eq(mcpTokens.userId, users.id))
		.where(eq(mcpTokens.tokenHash, tokenHash))
		.limit(1);
	const row = rows[0];
	if (!row) return null;
	// fire and forget; last-used is informational only
	db.update(mcpTokens)
		.set({ lastUsedAt: new Date() })
		.where(eq(mcpTokens.id, row.token.id))
		.catch(() => {});
	return row.user;
}

/** Resolves the Bearer token of an MCP/REST request to its user. */
export async function userFromBearer(request: Request): Promise<User | null> {
	const header = request.headers.get('authorization') ?? '';
	const match = header.match(/^Bearer\s+(.+)$/i);
	if (!match) return null;
	return userFromToken(match[1]);
}
