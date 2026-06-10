import { getAppSettings } from '$lib/server/app-settings';
import { buildThemeCss, DEFAULT_DARK, DEFAULT_LIGHT, parseTheme } from '$lib/theme';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const settings = await getAppSettings();
	const themeCss =
		settings.themeLight || settings.themeDark
			? buildThemeCss(
					parseTheme(settings.themeLight, DEFAULT_LIGHT),
					parseTheme(settings.themeDark, DEFAULT_DARK)
				)
			: '';

	return {
		user: locals.user
			? { id: locals.user.id, nickname: locals.user.nickname, isAdmin: locals.user.isAdmin }
			: null,
		themeCss
	};
};
