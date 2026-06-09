import { json } from '@sveltejs/kit';
import { getInterests } from '$lib/server/articles';
import { userFromBearer } from '$lib/server/mcp-auth';
import type { RequestHandler } from './$types';

/** Token-authenticated REST variant of the MCP get_interests tool. */
export const GET: RequestHandler = async ({ request }) => {
	const user = await userFromBearer(request);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
	return json({ categories: await getInterests(user.id) });
};
