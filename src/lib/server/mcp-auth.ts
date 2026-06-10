import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { mcpTokens, users } from '$lib/server/db/schema';
import { sha256 } from '$lib/server/auth';

/** Personal tokens act for one user, group tokens for all group members. */
export type TokenScope = { kind: 'user'; userId: string } | { kind: 'group'; groupId: string };

/** Resolves a raw MCP token (from header or secret URL path) to its scope. */
export async function scopeFromToken(raw: string): Promise<TokenScope | null> {
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
	if (row.token.groupId) return { kind: 'group', groupId: row.token.groupId };
	return { kind: 'user', userId: row.user.id };
}

/** Resolves the Bearer token of an MCP/REST request to its scope. */
export async function scopeFromBearer(request: Request): Promise<TokenScope | null> {
	const header = request.headers.get('authorization') ?? '';
	const match = header.match(/^Bearer\s+(.+)$/i);
	if (!match) return null;
	return scopeFromToken(match[1]);
}
