import { json } from '@sveltejs/kit';
import { getInterests, getInterestsForGroup } from '$lib/server/articles';
import { scopeFromBearer } from '$lib/server/mcp-auth';
import type { RequestHandler } from './$types';

/** Token-authenticated REST variant of the MCP get_interests tool. */
export const GET: RequestHandler = async ({ request }) => {
	const scope = await scopeFromBearer(request);
	if (!scope) return json({ error: 'Unauthorized' }, { status: 401 });
	if (scope.kind === 'group') {
		return json({ mode: 'group', users: await getInterestsForGroup(scope.groupId) });
	}
	return json({ categories: await getInterests(scope.userId) });
};
