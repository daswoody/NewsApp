import { getAppSettings } from '$lib/server/app-settings';
import {
	buildThemeCss,
	DEFAULT_DARK,
	DEFAULT_LIGHT,
	parseTheme,
	parseTypography
} from '$lib/theme';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	const settings = await getAppSettings();
	const light = parseTheme(settings.themeLight, DEFAULT_LIGHT);
	const dark = parseTheme(settings.themeDark, DEFAULT_DARK);
	const themeCss = buildThemeCss(
		light,
		dark,
		parseTypography({
			headline: settings.fontHeadline,
			headlineStyle: settings.fontHeadlineStyle,
			articleHeadings: settings.fontArticleHeadings,
			articleHeadingsStyle: settings.fontArticleHeadingsStyle,
			body: settings.fontBody
		}),
		settings.parallaxStrength / 100
	);

	return {
		user: locals.user
			? { id: locals.user.id, nickname: locals.user.nickname, isAdmin: locals.user.isAdmin }
			: null,
		themeCss,
		// colors the browser chrome (Android status bar) to match the mode
		themeColor: cookies.get('theme') === 'dark' ? dark.bg : light.bg
	};
};
