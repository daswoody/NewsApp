/** Pastel chip palettes in the spirit of editorial magazine tags. */
const PALETTES = [
	'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300',
	'bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-300',
	'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300',
	'bg-rose-100 text-rose-900 dark:bg-rose-500/15 dark:text-rose-300',
	'bg-violet-100 text-violet-900 dark:bg-violet-500/15 dark:text-violet-300',
	'bg-cyan-100 text-cyan-900 dark:bg-cyan-500/15 dark:text-cyan-300'
];

/** Stable pastel color classes for a category title. */
export function chipColor(title: string): string {
	let hash = 0;
	for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return PALETTES[hash % PALETTES.length];
}
