const dayFormatter = new Intl.DateTimeFormat('de-DE', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	year: 'numeric'
});

function dayKey(date: Date): string {
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** "Heute", "Gestern" or a long German date for grouping headers. */
export function dayLabel(value: Date | string): string {
	const date = new Date(value);
	const now = new Date();
	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	if (dayKey(date) === dayKey(now)) return 'Heute';
	if (dayKey(date) === dayKey(yesterday)) return 'Gestern';
	return dayFormatter.format(date);
}

export function shortDate(value: Date | string): string {
	return new Intl.DateTimeFormat('de-DE', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	}).format(new Date(value));
}

export function groupByDay<T extends { publishedAt: Date | string }>(
	items: T[]
): { label: string; items: T[] }[] {
	const groups: { label: string; items: T[] }[] = [];
	for (const item of items) {
		const label = dayLabel(item.publishedAt);
		const last = groups[groups.length - 1];
		if (last && last.label === label) last.items.push(item);
		else groups.push({ label, items: [item] });
	}
	return groups;
}
