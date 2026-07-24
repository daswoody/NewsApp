/**
 * Deterministic pastel mesh gradients for articles without an image.
 *
 * The base hue comes from the category (matching the tag chip palette), the
 * variation – hue spread and blob positions – from the article id, so every
 * card gets its own gradient that stays the same across reloads. Only hues
 * and positions are inlined; saturation and lightness live in `.gradient-ph`
 * (app.css) so the light and dark mode versions differ automatically.
 */

/** Base hues in the order of the chip palettes: amber, sky, emerald, rose, violet, cyan. */
const CATEGORY_HUES = [40, 205, 155, 350, 268, 190];

function hash(value: string): number {
	let h = 0;
	for (const char of value) h = (h * 31 + char.charCodeAt(0)) >>> 0;
	return h;
}

function wrapHue(value: number): number {
	return ((value % 360) + 360) % 360;
}

export function placeholderGradient(seed: string, categoryTitle: string): string {
	const base = CATEGORY_HUES[hash(categoryTitle) % CATEGORY_HUES.length];
	const h = hash(seed);
	// one hue near the category, one warmer, one cooler – the mix is what makes
	// the gradient look organic instead of like a flat tint
	const hueA = wrapHue(base + (h % 21) - 10);
	const hueB = wrapHue(base + 34 + ((h >> 5) % 46));
	const hueC = wrapHue(base - 34 - ((h >> 10) % 46));
	const vars = [
		`--ph-h-a:${hueA}`,
		`--ph-h-b:${hueB}`,
		`--ph-h-c:${hueC}`,
		`--ph-x-a:${6 + ((h >> 15) % 28)}%`,
		`--ph-y-a:${8 + ((h >> 18) % 26)}%`,
		`--ph-x-b:${66 + ((h >> 21) % 28)}%`,
		`--ph-y-b:${4 + ((h >> 24) % 30)}%`,
		`--ph-x-c:${28 + ((h >> 3) % 46)}%`,
		`--ph-y-c:${72 + ((h >> 7) % 26)}%`
	];
	return vars.join(';');
}
