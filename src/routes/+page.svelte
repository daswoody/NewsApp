<script lang="ts">
	import ArticleCard from '$lib/components/ArticleCard.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { groupByDay } from '$lib/dates';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const groups = $derived(groupByDay(data.articles));
	const noFilter = $derived(!data.savedOnly && !data.selectedCategoryId);

	const chipBase =
		'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition';
	const chipInactive =
		'border border-token bg-[var(--card)] text-muted hover:text-[var(--text)]';
	const chipActive = 'bg-[var(--accent)] text-[var(--on-accent)]';
</script>

<svelte:head><title>News</title></svelte:head>

<div class="mx-auto min-h-dvh max-w-7xl px-4 pb-36 sm:pb-16">
	<header class="flex items-center justify-between py-5">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl accent-soft text-xl">📰</div>
			<div>
				<p class="text-faint text-xs">Deine News</p>
				<h1 class="font-display text-lg leading-tight">{data.nickname}</h1>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<ThemeToggle />
			<a href="/settings" aria-label="Einstellungen" class="icon-btn h-10 w-10">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="h-5 w-5">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M9.6 3.9c.2-.8.9-1.4 1.8-1.4h1.2c.9 0 1.6.6 1.8 1.4l.2.9c.1.5.5.9 1 1.1l.8.5c.4.3 1 .3 1.5.1l.8-.3c.8-.3 1.7 0 2.1.7l.6 1c.4.8.3 1.7-.4 2.2l-.7.6c-.4.3-.6.8-.6 1.3s.2 1 .6 1.3l.7.6c.7.5.8 1.4.4 2.2l-.6 1c-.4.7-1.3 1-2.1.7l-.8-.3c-.5-.2-1.1-.1-1.5.1l-.8.5c-.5.2-.9.6-1 1.1l-.2.9c-.2.8-.9 1.4-1.8 1.4h-1.2c-.9 0-1.6-.6-1.8-1.4l-.2-.9c-.1-.5-.5-.9-1-1.1l-.8-.5c-.4-.3-1-.3-1.5-.1l-.8.3c-.8.3-1.7 0-2.1-.7l-.6-1c-.4-.8-.3-1.7.4-2.2l.7-.6c.4-.3.6-.8.6-1.3s-.2-1-.6-1.3l-.7-.6c-.7-.5-.8-1.4-.4-2.2l.6-1c.4-.7 1.3-1 2.1-.7l.8.3c.5.2 1.1.1 1.5-.1l.8-.5c.5-.2.9-.6 1-1.1l.2-.9z"
					/>
					<circle cx="12" cy="12" r="3" />
				</svg>
			</a>
		</div>
	</header>

	<!-- chip bar: sticky below the top on desktop, thumb-friendly fixed bottom bar on mobile -->
	<div
		class="bar fixed inset-x-0 bottom-0 z-30 border-t px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:sticky sm:top-0 sm:bottom-auto sm:-mx-4 sm:border-t-0 sm:border-b sm:py-3"
	>
		<nav class="no-scrollbar flex gap-2 overflow-x-auto" aria-label="Kategorien">
			<a href="/" class="{chipBase} {noFilter ? chipActive : chipInactive}">Alle</a>
			<a
				href="/?saved=1"
				class="{chipBase} {data.savedOnly
					? 'bg-amber-400 text-stone-900'
					: chipInactive}"
			>
				★ Gemerkt
			</a>
			{#each data.categories as cat (cat.id)}
				<a
					href={`/?cat=${cat.id}`}
					class="{chipBase} {data.selectedCategoryId === cat.id ? chipActive : chipInactive}"
				>
					{cat.title}
				</a>
			{/each}
		</nav>

		{#if data.selectedCategoryId && data.topics.length > 0}
			<nav class="no-scrollbar mt-2 flex gap-2 overflow-x-auto" aria-label="Hot Topics">
				<a
					href={`/?cat=${data.selectedCategoryId}`}
					class="shrink-0 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition {!data.selectedTopicId
						? chipActive
						: chipInactive}"
				>
					Alle Topics
				</a>
				{#each data.topics as topic (topic.id)}
					<a
						href={`/?cat=${data.selectedCategoryId}&topic=${topic.id}`}
						class="shrink-0 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition {data.selectedTopicId ===
						topic.id
							? chipActive
							: chipInactive}"
					>
						{topic.title}
					</a>
				{/each}
			</nav>
		{/if}
	</div>

	<!-- grouped article cards -->
	{#if groups.length === 0}
		<div class="mt-20 text-center">
			<p class="text-5xl">🗞️</p>
			<h2 class="font-display mt-4 text-xl">Noch keine News</h2>
			<p class="text-muted mx-auto mt-2 max-w-md text-sm leading-relaxed">
				{#if data.savedOnly}
					Du hast noch keine Artikel gemerkt. Tippe auf den Stern einer News-Karte, um sie hier zu sammeln.
				{:else if data.categories.length === 0}
					Lege zuerst in den <a href="/settings" class="text-accent underline">Einstellungen</a>
					deine Interessen-Kategorien an und verbinde dann deine KI über den MCP-Server.
				{:else}
					Verbinde deine KI über den MCP-Server (siehe <a href="/settings?tab=ki" class="text-accent underline">Einstellungen</a>)
					und lass sie News zu deinen Interessen recherchieren.
				{/if}
			</p>
		</div>
	{:else}
		{#each groups as group (group.label)}
			<section class="mt-8">
				<h2 class="text-muted mb-4 flex items-center gap-3 text-sm font-semibold tracking-wide uppercase">
					{group.label}
					<span class="h-px flex-1 bg-[var(--border)]"></span>
				</h2>
				<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each group.items as article (article.id)}
						<ArticleCard {article} showSummary={data.showCardSummary} />
					{/each}
				</div>
			</section>
		{/each}
	{/if}
</div>
