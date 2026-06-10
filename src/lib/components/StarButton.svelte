<script lang="ts">
	import { enhance } from '$app/forms';

	let {
		articleId,
		saved,
		action = '/?/toggleSave',
		size = 'h-5 w-5'
	}: { articleId: string; saved: boolean; action?: string; size?: string } = $props();
</script>

<form method="POST" {action} use:enhance class="contents">
	<input type="hidden" name="id" value={articleId} />
	<button
		type="submit"
		aria-label={saved ? 'Nicht mehr merken' : 'Artikel merken'}
		title={saved ? 'Nicht mehr merken' : 'Artikel merken'}
		class="flex h-9 w-9 items-center justify-center rounded-full bg-white/85 shadow-sm backdrop-blur transition hover:bg-white dark:bg-slate-950/70 dark:shadow-none dark:hover:bg-slate-800 {saved
			? 'text-amber-500 dark:text-amber-400'
			: 'text-stone-500 dark:text-slate-300'}"
		onclick={(e) => e.stopPropagation()}
	>
		<svg
			viewBox="0 0 24 24"
			fill={saved ? 'currentColor' : 'none'}
			stroke="currentColor"
			stroke-width="1.8"
			class={size}
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M11.48 3.5c.16-.4.88-.4 1.04 0l2.13 5.11 5.52.45c.44.03.61.58.28.86l-4.2 3.6 1.28 5.39c.1.43-.36.77-.74.54L12 16.56l-4.79 2.9c-.38.22-.84-.12-.74-.55l1.28-5.39-4.2-3.6c-.33-.28-.16-.83.28-.86l5.52-.44 2.13-5.12z"
			/>
		</svg>
	</button>
</form>
