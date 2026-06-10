<script lang="ts">
	import StarButton from '$lib/components/StarButton.svelte';
	import { parallax } from '$lib/actions/parallax';
	import { chipColor } from '$lib/chip-colors';
	import { shortDate } from '$lib/dates';

	let {
		article
	}: {
		article: {
			id: string;
			headline: string;
			summary: string;
			imagePath: string | null;
			saved: boolean;
			publishedAt: Date | string;
			categoryTitle: string;
			topicTitle: string | null;
		};
	} = $props();

	const tag = $derived(
		article.topicTitle ? `${article.categoryTitle} / ${article.topicTitle}` : article.categoryTitle
	);
</script>

<article class="card group relative p-3 transition hover:shadow-md dark:hover:border-slate-600">
	<a href={`/article/${article.id}`} class="block">
		<div class="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-stone-200 dark:bg-slate-800">
			{#if article.imagePath}
				<img
					src={`/images/${article.imagePath}`}
					alt=""
					loading="lazy"
					use:parallax
					class="h-full w-full object-cover"
				/>
			{:else}
				<div
					class="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-100 via-stone-200 to-teal-100 text-4xl dark:from-slate-800 dark:via-slate-900 dark:to-teal-950"
				>
					📰
				</div>
			{/if}
		</div>
		<div class="space-y-2 px-1 pt-3 pb-1">
			<span class="inline-block rounded-md px-2.5 py-1 text-xs font-semibold {chipColor(article.categoryTitle)}">
				{tag}
			</span>
			<h3 class="font-display text-lg leading-snug font-bold">{article.headline}</h3>
			<p class="text-muted line-clamp-3 text-sm leading-relaxed">{article.summary}</p>
			<p class="text-faint text-xs">{shortDate(article.publishedAt)}</p>
		</div>
	</a>
	<div class="absolute top-5 right-5">
		<StarButton articleId={article.id} saved={article.saved} />
	</div>
</article>
