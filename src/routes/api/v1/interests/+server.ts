import { json } from '@sveltejs/kit';
import { getInterests, getInterestsForAllUsers } from '$lib/server/articles';
import { getAppSettings } from '$lib/server/app-settings';
import { userFromBearer } from '$lib/server/mcp-auth';
import type { RequestHandler } from './$types';

/** Token-authenticated REST variant of the MCP get_interests tool. */
export const GET: RequestHandler = async ({ request }) => {
	const user = await userFromBearer(request);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
	const settings = await getAppSettings();
	if (settings.mcpGlobal && user.isAdmin) {
		return json({ mode: 'central', users: await getInterestsForAllUsers() });
	}
	return json({ categories: await getInterests(user.id) });
};
