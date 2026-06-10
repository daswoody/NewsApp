import { handleMcpPost } from '$lib/server/mcp';
import { scopeFromToken } from '$lib/server/mcp-auth';
import type { RequestHandler } from './$types';

/**
 * Secret-URL variant of the MCP endpoint for clients that cannot send
 * custom headers (e.g. Claude Desktop custom connectors without OAuth):
 * the access token is part of the path, the URL itself is the secret.
 */

function unauthorized(): Response {
	return Response.json(
		{ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized: invalid token' } },
		{ status: 401 }
	);
}

export const POST: RequestHandler = async ({ request, params }) => {
	const scope = await scopeFromToken(params.token);
	if (!scope) return unauthorized();
	return handleMcpPost(scope, request);
};

export const GET: RequestHandler = async () =>
	new Response(null, { status: 405, headers: { allow: 'POST, DELETE' } });

export const DELETE: RequestHandler = async () => new Response(null, { status: 200 });
