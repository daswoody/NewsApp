/** Pastel chip palettes in the spirit of editorial magazine tags. */
const PALETTES = [
	{
		solid: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300',
		soft: 'border border-amber-300 text-amber-800 dark:border-amber-500/40 dark:text-amber-300'
	},
	{
		solid: 'bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-300',
		soft: 'border border-sky-300 text-sky-800 dark:border-sky-500/40 dark:text-sky-300'
	},
	{
		solid: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300',
		soft: 'border border-emerald-300 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-300'
	},
	{
		solid: 'bg-rose-100 text-rose-900 dark:bg-rose-500/15 dark:text-rose-300',
		soft: 'border border-rose-300 text-rose-800 dark:border-rose-500/40 dark:text-rose-300'
	},
	{
		solid: 'bg-violet-100 text-violet-900 dark:bg-violet-500/15 dark:text-violet-300',
		soft: 'border border-violet-300 text-violet-800 dark:border-violet-500/40 dark:text-violet-300'
	},
	{
		solid: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-500/15 dark:text-cyan-300',
		soft: 'border border-cyan-300 text-cyan-800 dark:border-cyan-500/40 dark:text-cyan-300'
	}
];

function paletteFor(title: string) {
	let hash = 0;
	for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return PALETTES[hash % PALETTES.length];
}

/** Filled chip classes for a category title. */
export function chipColor(title: string): string {
	return paletteFor(title).solid;
}

/**
 * Outlined chip classes in the same hue – used for the hot-topic chip so it
 * reads as a child of the category chip next to it.
 */
export function chipColorSoft(title: string): string {
	return paletteFor(title).soft;
}
