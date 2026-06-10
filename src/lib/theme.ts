/**
 * Curated design tokens, editable per mode in the admin panel and
 * rendered as CSS custom properties. Everything else in the UI derives
 * from these values (muted/faint text, soft backgrounds, accent tints).
 */

export interface ThemeTokens {
	bg: string;
	card: string;
	text: string;
	accent: string;
	border: string;
	cardBorder: boolean;
	radius: number; // px
	font: 'serif' | 'sans';
}

export const DEFAULT_LIGHT: ThemeTokens = {
	bg: '#f6f5f1',
	card: '#ffffff',
	text: '#1c1917',
	accent: '#0d9488',
	border: '#e7e5e4',
	cardBorder: false,
	radius: 16,
	font: 'serif'
};

export const DEFAULT_DARK: ThemeTokens = {
	bg: '#020617',
	card: '#0f172a',
	text: '#f1f5f9',
	accent: '#2dd4bf',
	border: '#1e293b',
	cardBorder: true,
	radius: 16,
	font: 'serif'
};

const FONT_STACKS: Record<ThemeTokens['font'], string> = {
	serif: "Georgia, 'Times New Roman', ui-serif, serif",
	sans: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
};

const HEX = /^#[0-9a-fA-F]{6}$/;

export function parseTheme(json: string, fallback: ThemeTokens): ThemeTokens {
	if (!json) return fallback;
	try {
		const raw = JSON.parse(json) as Partial<ThemeTokens>;
		return {
			bg: HEX.test(raw.bg ?? '') ? raw.bg! : fallback.bg,
			card: HEX.test(raw.card ?? '') ? raw.card! : fallback.card,
			text: HEX.test(raw.text ?? '') ? raw.text! : fallback.text,
			accent: HEX.test(raw.accent ?? '') ? raw.accent! : fallback.accent,
			border: HEX.test(raw.border ?? '') ? raw.border! : fallback.border,
			cardBorder: typeof raw.cardBorder === 'boolean' ? raw.cardBorder : fallback.cardBorder,
			radius: Number.isFinite(raw.radius)
				? Math.min(32, Math.max(0, Number(raw.radius)))
				: fallback.radius,
			font: raw.font === 'sans' || raw.font === 'serif' ? raw.font : fallback.font
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
		`--text: ${t.text};`,
		`--accent: ${t.accent};`,
		`--on-accent: ${onColor(t.accent)};`,
		`--border: ${t.border};`,
		`--card-border: ${t.cardBorder ? t.border : 'transparent'};`,
		`--radius: ${t.radius}px;`,
		`--font-display: ${FONT_STACKS[t.font]};`
	].join(' ');
}

export function buildThemeCss(light: ThemeTokens, dark: ThemeTokens): string {
	// doubled :root selectors out-rank the defaults in app.css regardless of
	// the order in which the browser receives the two stylesheets
	return `:root:root { ${tokenBlock(light)} }\n:root:root.dark { ${tokenBlock(dark)} }`;
}
