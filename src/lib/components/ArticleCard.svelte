<script lang="ts">
	import StarButton from '$lib/components/StarButton.svelte';
	import { parallax } from '$lib/actions/parallax';
	import { chipColor } from '$lib/chip-colors';
	import { shortDate } from '$lib/dates';

	let {
		article,
		showSummary = true
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
		showSummary?: boolean;
	} = $props();

	const tag = $derived(
		article.topicTitle ? `${article.categoryTitle} / ${article.topicTitle}` : article.categoryTitle
	);
</script>

<article class="news-card group relative overflow-hidden">
	<a href={`/article/${article.id}`} class="block">
		<div class="bg-soft relative aspect-[4/3] w-full overflow-hidden rounded-[calc(var(--radius)*1.1)]">
			{#if article.imagePath}
				<!-- parallax shifts the wrapper while scrolling, hover zooms the image itself -->
				<div use:parallax class="h-full w-full">
					<img
						src={`/images/${article.imagePath}`}
						alt=""
						loading="lazy"
						class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
					/>
				</div>
			{:else}
				<div class="bg-soft flex h-full w-full items-center justify-center text-4xl">📰</div>
			{/if}
		</div>
		<div class="space-y-2 p-4">
			<span class="inline-block rounded-md px-2.5 py-1 text-xs font-semibold {chipColor(article.categoryTitle)}">
				{tag}
			</span>
			<h3 class="font-display text-lg leading-snug font-bold">{article.headline}</h3>
			{#if showSummary}
				<p class="text-muted line-clamp-3 text-sm leading-relaxed">{article.summary}</p>
			{/if}
			<p class="text-faint text-xs">{shortDate(article.publishedAt)}</p>
		</div>
	</a>
	<div class="absolute top-2.5 right-2.5">
		<StarButton articleId={article.id} saved={article.saved} />
	</div>
</article>
