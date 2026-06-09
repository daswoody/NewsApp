<script lang="ts">
	import ArticleCard from '$lib/components/ArticleCard.svelte';
	import { groupByDay } from '$lib/dates';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const groups = $derived(groupByDay(data.articles));
	const noFilter = $derived(!data.savedOnly && !data.selectedCategoryId);

	function catHref(catId: string | null): string {
		return catId ? `/?cat=${catId}` : '/';
	}
</script>

<svelte:head><title>News</title></svelte:head>

<div class="mx-auto min-h-dvh max-w-7xl px-4 pb-16">
	<header class="flex items-center justify-between py-5">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-xl">📰</div>
			<div>
				<p class="text-xs text-slate-500">Deine News</p>
				<h1 class="text-lg leading-tight font-bold">{data.nickname}</h1>
			</div>
		</div>
		<a
			href="/settings"
			aria-label="Einstellungen"
			class="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-slate-600 hover:text-white"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="h-5 w-5">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M9.6 3.9c.2-.8.9-1.4 1.8-1.4h1.2c.9 0 1.6.6 1.8 1.4l.2.9c.1.5.5.9 1 1.1l.8.5c.4.3 1 .3 1.5.1l.8-.3c.8-.3 1.7 0 2.1.7l.6 1c.4.8.3 1.7-.4 2.2l-.7.6c-.4.3-.6.8-.6 1.3s.2 1 .6 1.3l.7.6c.7.5.8 1.4.4 2.2l-.6 1c-.4.7-1.3 1-2.1.7l-.8-.3c-.5-.2-1.1-.1-1.5.1l-.8.5c-.5.2-.9.6-1 1.1l-.2.9c-.2.8-.9 1.4-1.8 1.4h-1.2c-.9 0-1.6-.6-1.8-1.4l-.2-.9c-.1-.5-.5-.9-1-1.1l-.8-.5c-.4-.3-1-.3-1.5-.1l-.8.3c-.8.3-1.7 0-2.1-.7l-.6-1c-.4-.8-.3-1.7.4-2.2l.7-.6c.4-.3.6-.8.6-1.3s-.2-1-.6-1.3l-.7-.6c-.7-.5-.8-1.4-.4-2.2l.6-1c.4-.7 1.3-1 2.1-.7l.8.3c.5.2 1.1.1 1.5-.1l.8-.5c.5-.2.9-.6 1-1.1l.2-.9z"
				/>
				<circle cx="12" cy="12" r="3" />
			</svg>
		</a>
	</header>

	<!-- category chips -->
	<nav class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Kategorien">
		<a
			href="/"
			class="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition {noFilter
				? 'bg-teal-500 text-slate-950'
				: 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'}"
		>
			Alle
		</a>
		<a
			href="/?saved=1"
			class="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition {data.savedOnly
				? 'bg-amber-400 text-slate-950'
				: 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'}"
		>
			★ Gemerkt
		</a>
		{#each data.categories as cat (cat.id)}
			<a
				href={catHref(cat.id)}
				class="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition {data.selectedCategoryId ===
				cat.id
					? 'bg-teal-500 text-slate-950'
					: 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'}"
			>
				{cat.title}
			</a>
		{/each}
	</nav>

	<!-- hot topic chips for the selected category -->
	{#if data.selectedCategoryId && data.topics.length > 0}
		<nav class="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Hot Topics">
			<a
				href={catHref(data.selectedCategoryId)}
				class="shrink-0 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition {!data.selectedTopicId
					? 'bg-slate-200 text-slate-950'
					: 'border border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'}"
			>
				Alle Topics
			</a>
			{#each data.topics as topic (topic.id)}
				<a
					href={`/?cat=${data.selectedCategoryId}&topic=${topic.id}`}
					class="shrink-0 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition {data.selectedTopicId ===
					topic.id
						? 'bg-slate-200 text-slate-950'
						: 'border border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'}"
				>
					{topic.title}
				</a>
			{/each}
		</nav>
	{/if}

	<!-- grouped article cards -->
	{#if groups.length === 0}
		<div class="mt-20 text-center">
			<p class="text-5xl">🗞️</p>
			<h2 class="mt-4 text-lg font-bold">Noch keine News</h2>
			<p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
				{#if data.savedOnly}
					Du hast noch keine Artikel gemerkt. Tippe auf den Stern einer News-Karte, um sie hier zu sammeln.
				{:else if data.categories.length === 0}
					Lege zuerst in den <a href="/settings" class="text-teal-400 underline">Einstellungen</a> deine
					Interessen-Kategorien an und verbinde dann deine KI über den MCP-Server.
				{:else}
					Verbinde deine KI über den MCP-Server (siehe <a href="/settings?tab=ki" class="text-teal-400 underline">Einstellungen</a>)
					und lass sie News zu deinen Interessen recherchieren.
				{/if}
			</p>
		</div>
	{:else}
		{#each groups as group (group.label)}
			<section class="mt-8">
				<h2 class="mb-4 flex items-center gap-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">
					{group.label}
					<span class="h-px flex-1 bg-slate-800"></span>
				</h2>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each group.items as article (article.id)}
						<ArticleCard {article} />
					{/each}
				</div>
			</section>
		{/each}
	{/if}
</div>
