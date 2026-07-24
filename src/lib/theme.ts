/**
 * Curated design tokens, editable per mode in the admin panel and
 * rendered as CSS custom properties. Everything else in the UI derives
 * from these values (muted/faint text, soft backgrounds, accent tints).
 */

export interface ThemeTokens {
	bg: string;
	card: string;
	newsCard: string;
	text: string;
	accent: string;
	border: string;
	cardBorder: boolean;
	radius: number; // px
}

export const DEFAULT_LIGHT: ThemeTokens = {
	bg: '#f6f5f1',
	card: '#ffffff',
	newsCard: '#ffffff',
	text: '#1c1917',
	accent: '#0d9488',
	border: '#e7e5e4',
	cardBorder: false,
	radius: 16
};

export const DEFAULT_DARK: ThemeTokens = {
	bg: '#020617',
	card: '#0f172a',
	newsCard: '#0f172a',
	text: '#f1f5f9',
	accent: '#2dd4bf',
	border: '#1e293b',
	cardBorder: true,
	radius: 16
};

/* ---------- fonts (self-hosted Google Fonts via @fontsource) ---------- */

export type FontStyle = 'regular' | 'bold' | 'italic';

export interface Typography {
	headline: string; // card headlines + article title
	headlineStyle: FontStyle;
	articleHeadings: string; // h2/h3 inside articles ('' = same as headline)
	articleHeadingsStyle: FontStyle;
	body: string; // article body text
}

export const DEFAULT_TYPOGRAPHY: Typography = {
	headline: 'system-serif',
	headlineStyle: 'bold',
	articleHeadings: '',
	articleHeadingsStyle: 'bold',
	body: 'system-sans'
};

export const FONT_STYLE_OPTIONS: { id: FontStyle; label: string }[] = [
	{ id: 'bold', label: 'Fett' },
	{ id: 'regular', label: 'Regular' },
	{ id: 'italic', label: 'Kursiv' }
];

function isFontStyle(value: string): value is FontStyle {
	return value === 'regular' || value === 'bold' || value === 'italic';
}

const FONT_FAMILIES: Record<string, string> = {
	'system-serif': "Georgia, 'Times New Roman', ui-serif, serif",
	'system-sans': "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
	inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
	roboto: "'Roboto', ui-sans-serif, system-ui, sans-serif",
	'open-sans': "'Open Sans', ui-sans-serif, system-ui, sans-serif",
	montserrat: "'Montserrat', ui-sans-serif, system-ui, sans-serif",
	poppins: "'Poppins', ui-sans-serif, system-ui, sans-serif",
	'noto-sans': "'Noto Sans', ui-sans-serif, system-ui, sans-serif",
	merriweather: "'Merriweather', Georgia, ui-serif, serif",
	'playfair-display': "'Playfair Display', Georgia, ui-serif, serif",
	lora: "'Lora', Georgia, ui-serif, serif",
	'source-serif-4': "'Source Serif 4', Georgia, ui-serif, serif"
};

export const FONT_OPTIONS: { id: string; label: string }[] = [
	{ id: 'system-serif', label: 'System Serif (Georgia)' },
	{ id: 'system-sans', label: 'System Sans' },
	{ id: 'inter', label: 'Inter' },
	{ id: 'roboto', label: 'Roboto' },
	{ id: 'open-sans', label: 'Open Sans' },
	{ id: 'montserrat', label: 'Montserrat' },
	{ id: 'poppins', label: 'Poppins' },
	{ id: 'noto-sans', label: 'Noto Sans' },
	{ id: 'merriweather', label: 'Merriweather' },
	{ id: 'playfair-display', label: 'Playfair Display' },
	{ id: 'lora', label: 'Lora' },
	{ id: 'source-serif-4', label: 'Source Serif 4' }
];

export function isFontId(id: string): boolean {
	return id in FONT_FAMILIES;
}

function fontFamily(id: string, fallbackId: string): string {
	return FONT_FAMILIES[id] ?? FONT_FAMILIES[fallbackId];
}

export function parseTypography(raw: Partial<Record<keyof Typography, string>>): Typography {
	return {
		headline: isFontId(raw.headline ?? '') ? raw.headline! : DEFAULT_TYPOGRAPHY.headline,
		headlineStyle: isFontStyle(raw.headlineStyle ?? '')
			? (raw.headlineStyle as FontStyle)
			: DEFAULT_TYPOGRAPHY.headlineStyle,
		articleHeadings: isFontId(raw.articleHeadings ?? '') ? raw.articleHeadings! : '',
		articleHeadingsStyle: isFontStyle(raw.articleHeadingsStyle ?? '')
			? (raw.articleHeadingsStyle as FontStyle)
			: DEFAULT_TYPOGRAPHY.articleHeadingsStyle,
		body: isFontId(raw.body ?? '') ? raw.body! : DEFAULT_TYPOGRAPHY.body
	};
}

/* ---------- gradient placeholders (articles without an image) ---------- */

export interface PlaceholderStyle {
	intensity: number; // 0 = barely visible, 1 = strong contrast to the card
	saturation: number; // 0 = almost grey, 1 = vivid
}

export const DEFAULT_PLACEHOLDER: PlaceholderStyle = { intensity: 0.5, saturation: 0.5 };

/**
 * Saturation and lightness of the three gradient blobs. Intensity moves the
 * lightness away from the card background – upwards in light mode, downwards
 * in dark mode – so one slider works in both modes. Hues and blob positions
 * are per article and come from placeholder-gradient.ts.
 */
export function placeholderVars(style: PlaceholderStyle, dark: boolean): string {
	const i = Math.min(1, Math.max(0, style.intensity));
	const s = Math.min(1, Math.max(0, style.saturation));
	const round = (value: number) => Math.round(Math.min(100, Math.max(0, value)));
	// light mode is piecewise so the middle of the slider keeps the pastel
	// default (72%) while the end still reaches a fully saturated 100%
	const lightSat = s <= 0.5 ? 20 + 104 * s : 72 + 56 * (s - 0.5);
	const [sat, base, a, b, c] = dark
		? [6 + 40 * s, 9 + 10 * i, 13 + 18 * i, 11 + 14 * i, 14 + 20 * i]
		: [lightSat, 97 - 8 * i, 93 - 16 * i, 95 - 12 * i, 93 - 14 * i];
	return [
		`--ph-s: ${round(sat)}%;`,
		`--ph-l-base: ${round(base)}%;`,
		`--ph-l-a: ${round(a)}%;`,
		`--ph-l-b: ${round(b)}%;`,
		`--ph-l-c: ${round(c)}%;`
	].join(' ');
}

/* ---------- parsing + CSS generation ---------- */

const HEX = /^#[0-9a-fA-F]{6}$/;

export function parseTheme(json: string, fallback: ThemeTokens): ThemeTokens {
	if (!json) return fallback;
	try {
		const raw = JSON.parse(json) as Partial<ThemeTokens>;
		return {
			bg: HEX.test(raw.bg ?? '') ? raw.bg! : fallback.bg,
			card: HEX.test(raw.card ?? '') ? raw.card! : fallback.card,
			newsCard: HEX.test(raw.newsCard ?? '') ? raw.newsCard! : fallback.newsCard,
			text: HEX.test(raw.text ?? '') ? raw.text! : fallback.text,
			accent: HEX.test(raw.accent ?? '') ? raw.accent! : fallback.accent,
			border: HEX.test(raw.border ?? '') ? raw.border! : fallback.border,
			cardBorder: typeof raw.cardBorder === 'boolean' ? raw.cardBorder : fallback.cardBorder,
			radius: Number.isFinite(raw.radius)
				? Math.min(32, Math.max(0, Number(raw.radius)))
				: fallback.radius
		};
	} catch {
		return fallback;
	}
}

/** black or white, depending on what reads better on the given color */
function onColor(hex: string): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.55 ? '#1c1917' : '#ffffff';
}

function tokenBlock(t: ThemeTokens): string {
	return [
		`--bg: ${t.bg};`,
		`--card: ${t.card};`,
		`--news-card: ${t.newsCard};`,
		`--text: ${t.text};`,
		`--accent: ${t.accent};`,
		`--on-accent: ${onColor(t.accent)};`,
		`--border: ${t.border};`,
		`--card-border: ${t.cardBorder ? t.border : 'transparent'};`,
		`--radius: ${t.radius}px;`
	].join(' ');
}

export function buildThemeCss(
	light: ThemeTokens,
	dark: ThemeTokens,
	typo: Typography,
	parallax = 0.35, // 0 = off, 1 = very strong
	placeholder: PlaceholderStyle = DEFAULT_PLACEHOLDER
): string {
	const styleVars = (style: FontStyle) =>
		style === 'bold' ? ['700', 'normal'] : style === 'italic' ? ['400', 'italic'] : ['400', 'normal'];
	const [headlineWeight, headlineStyle] = styleVars(typo.headlineStyle);
	const [articleWeight, articleStyle] = styleVars(typo.articleHeadingsStyle);
	const parallaxPx = Math.round(Math.min(1, Math.max(0, parallax)) * 40);
	const fonts = [
		`--font-display: ${fontFamily(typo.headline, 'system-serif')};`,
		`--font-display-weight: ${headlineWeight};`,
		`--font-display-style: ${headlineStyle};`,
		`--font-article-headings: ${fontFamily(typo.articleHeadings, typo.headline)};`,
		`--font-article-headings-weight: ${articleWeight};`,
		`--font-article-headings-style: ${articleStyle};`,
		`--font-body: ${fontFamily(typo.body, 'system-sans')};`,
		`--parallax: ${parallaxPx}px;`
	].join(' ');
	// doubled :root selectors out-rank the defaults in app.css regardless of
	// the order in which the browser receives the two stylesheets
	return (
		`:root:root { ${tokenBlock(light)} ${fonts} }\n` +
		`:root:root.dark { ${tokenBlock(dark)} }\n` +
		`:root:root .gradient-ph { ${placeholderVars(placeholder, false)} }\n` +
		`:root:root.dark .gradient-ph { ${placeholderVars(placeholder, true)} }`
	);
}
