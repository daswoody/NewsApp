import { handleMcpPost } from '$lib/server/mcp';
import { scopeFromBearer } from '$lib/server/mcp-auth';
import type { RequestHandler } from './$types';

function unauthorized(): Response {
	return Response.json(
		{ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized: Bearer token required' } },
		{ status: 401, headers: { 'www-authenticate': 'Bearer' } }
	);
}

export const POST: RequestHandler = async ({ request }) => {
	const scope = await scopeFromBearer(request);
	if (!scope) return unauthorized();
	return handleMcpPost(scope, request);
};

// Stateless server: no server-initiated SSE stream, sessions need no cleanup.
export const GET: RequestHandler = async () =>
	new Response(null, { status: 405, headers: { allow: 'POST, DELETE' } });

export const DELETE: RequestHandler = async () => new Response(null, { status: 200 });
