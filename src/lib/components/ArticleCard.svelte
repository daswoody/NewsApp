<script lang="ts">
	import StarButton from '$lib/components/StarButton.svelte';

	let {
		article
	}: {
		article: {
			id: string;
			headline: string;
			summary: string;
			imagePath: string | null;
			saved: boolean;
			categoryTitle: string;
			topicTitle: string | null;
		};
	} = $props();

	const tag = $derived(
		article.topicTitle ? `${article.categoryTitle} / ${article.topicTitle}` : article.categoryTitle
	);
</script>

<article
	class="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 transition hover:border-slate-600"
>
	<a href={`/article/${article.id}`} class="block">
		<div class="relative aspect-video w-full overflow-hidden bg-slate-800">
			{#if article.imagePath}
				<img
					src={`/images/${article.imagePath}`}
					alt=""
					loading="lazy"
					class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
				/>
			{:else}
				<div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-teal-950 text-4xl">
					📰
				</div>
			{/if}
		</div>
		<div class="space-y-2 p-4">
			<span class="inline-block rounded-full bg-teal-500/15 px-2.5 py-0.5 text-xs font-medium text-teal-300">
				{tag}
			</span>
			<h3 class="text-base leading-snug font-bold text-slate-100">{article.headline}</h3>
			<p class="line-clamp-3 text-sm leading-relaxed text-slate-400">{article.summary}</p>
		</div>
	</a>
	<div class="absolute top-2.5 right-2.5">
		<StarButton articleId={article.id} saved={article.saved} />
	</div>
</article>
