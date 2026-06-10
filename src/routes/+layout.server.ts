import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user
			? { id: locals.user.id, nickname: locals.user.nickname, isAdmin: locals.user.isAdmin }
			: null
	};
};
