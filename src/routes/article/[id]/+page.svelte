<script lang="ts">
	import { enhance } from '$app/forms';
	import StarButton from '$lib/components/StarButton.svelte';
	import { parallax } from '$lib/actions/parallax';
	import { chipColor } from '$lib/chip-colors';
	import { shortDate } from '$lib/dates';
	import { renderMarkdown } from '$lib/markdown';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const tag = $derived(
		data.topicTitle ? `${data.categoryTitle} / ${data.topicTitle}` : data.categoryTitle
	);

	let showTopicForm = $state(false);
	const topicSuggestion = $derived(
		data.article.headline.length > 40
			? `${data.article.headline.slice(0, 37).trimEnd()}…`
			: data.article.headline
	);

	type Bubble = { role: string; content: string; error?: boolean };
	let chat: Bubble[] = $state([]);
	let question = $state('');
	let sending = $state(false);
	let chatEnd: HTMLDivElement | undefined = $state();

	// reseed the chat when navigating to a different article
	let loadedArticleId = $state('');
	$effect(() => {
		if (data.article.id !== loadedArticleId) {
			loadedArticleId = data.article.id;
			chat = data.messages.map((m) => ({ role: m.role, content: m.content }));
		}
	});

	function scrollToChat() {
		setTimeout(() => chatEnd?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
	}

	async function ask(event: SubmitEvent) {
		event.preventDefault();
		const q = question.trim();
		if (!q || sending) return;
		question = '';
		sending = true;
		chat.push({ role: 'user', content: q });
		const bubble: Bubble = { role: 'assistant', content: '' };
		chat.push(bubble);
		scrollToChat();
		try {
			const res = await fetch(`/article/${data.article.id}/chat`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ question: q })
			});
			if (!res.ok) {
				const payload = await res.json().catch(() => null);
				bubble.content = payload?.error ?? 'Die Anfrage ist fehlgeschlagen.';
				bubble.error = true;
				return;
			}
			const reader = res.body!.getReader();
			const decoder = new TextDecoder();
			for (;;) {
				const { done, value } = await reader.read();
				if (done) break;
				bubble.content += decoder.decode(value, { stream: true });
				scrollToChat();
			}
			if (!bubble.content.trim()) {
				bubble.content = 'Die KI hat keine Antwort geliefert.';
				bubble.error = true;
			}
		} catch {
			bubble.content = 'Verbindung zur KI fehlgeschlagen.';
			bubble.error = true;
		} finally {
			sending = false;
			scrollToChat();
		}
	}
</script>

<svelte:head><title>{data.article.headline} – News</title></svelte:head>

<div class="min-h-dvh pb-36">
	<!-- hero image: full-bleed with bottom-rounded corners on mobile, inset
	     with a 16px top gap and a wider footprint than the content on desktop -->
	<div class="relative mx-auto max-w-4xl sm:px-4 sm:pt-4">
		<div
			class="bg-soft relative aspect-[16/10] w-full overflow-hidden rounded-b-[calc(var(--radius)*1.25)] sm:aspect-[16/8] sm:rounded-[calc(var(--radius)*1.25)]"
		>
			{#if data.article.imagePath}
				<div use:parallax={20} class="h-full w-full">
					<img src={`/images/${data.article.imagePath}`} alt="" class="h-full w-full object-cover" />
				</div>
			{:else}
				<div class="bg-soft flex h-full w-full items-center justify-center text-6xl">📰</div>
			{/if}
		</div>
		<!-- desktop back button; on mobile the one next to the chat input is used -->
		<a href="/" aria-label="Zurück zur Übersicht" class="icon-btn absolute top-8 left-8 hidden h-10 w-10 rounded-full sm:flex">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
			</svg>
		</a>
	</div>

	<div class="mx-auto max-w-3xl px-4">
		<h1 class="font-display mt-6 text-2xl leading-tight sm:text-3xl">
			{data.article.headline}
		</h1>

		<!-- meta row -->
		<div class="text-muted mt-3 flex flex-wrap items-center gap-2 text-sm">
			<span>{shortDate(data.article.publishedAt)}</span>
			<span class="text-faint">•</span>
			<span class="rounded-md px-2.5 py-1 text-xs font-semibold {chipColor(data.categoryTitle)}">{tag}</span>
			<span class="flex-1"></span>
			<StarButton articleId={data.article.id} saved={data.article.saved} action="?/toggleSave" />
			{#if !data.article.hasTopic && !showTopicForm}
				<button
					type="button"
					onclick={() => (showTopicForm = true)}
					title="Erzeugt ein Hot Topic zu diesem Thema, damit künftig mehr News dazu erscheinen"
					class="btn-ghost rounded-full px-3 py-1.5 text-xs font-medium"
				>
					+ Als Sub-Topic festlegen
				</button>
			{/if}
		</div>
		{#if form?.error}
			<p class="mt-2 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
				{form.error}
			</p>
		{/if}
		{#if showTopicForm && !data.article.hasTopic}
			<form
				method="POST"
				action="?/makeTopic"
				use:enhance={() => async ({ update }) => {
					showTopicForm = false;
					await update();
				}}
				class="subcard mt-3 space-y-2 p-3"
			>
				<p class="text-muted text-xs">
					Neues Hot Topic in „{data.categoryTitle}" – Titel und Beschreibung anpassen, damit künftige
					Recherchen mehr News dazu liefern:
				</p>
				<input name="title" required maxlength="40" value={topicSuggestion} class="input" />
				<textarea name="description" rows="2" class="input">{data.article.summary}</textarea>
				<div class="flex gap-2">
					<button type="submit" class="btn-primary px-4 py-1.5 text-xs">Sub-Topic anlegen</button>
					<button type="button" onclick={() => (showTopicForm = false)} class="btn-ghost px-4 py-1.5 text-xs">
						Abbrechen
					</button>
				</div>
			</form>
		{/if}
		{#if form && 'topicCreated' in form && form.topicCreated}
			<p class="mt-2 accent-soft rounded-lg px-3 py-2 text-sm">
				Sub-Topic „{form.topicCreated}" angelegt – künftige Recherchen liefern mehr News dazu.
			</p>
		{/if}

		<!-- article body -->
		<div class="article-body mt-6 text-[0.97rem]">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- rendered by our escaping markdown renderer -->
			{@html data.bodyHtml}
		</div>

		<!-- sources -->
		{#if data.sources.length > 0}
			<h2 class="text-muted mt-8 mb-3 text-sm font-semibold tracking-wide uppercase">Quellen</h2>
			<div class="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
				{#each data.sources as source (source.id)}
					<a
						href={source.url}
						target="_blank"
						rel="noopener noreferrer"
						class="card w-56 shrink-0 p-4 transition hover:border-[var(--faint)]"
					>
						<p class="truncate text-sm font-semibold">{source.name}</p>
						<p class="text-faint mt-1 truncate text-xs">{source.url}</p>
						<p class="text-accent mt-3 text-xs font-medium">Quelle öffnen ↗</p>
					</a>
				{/each}
			</div>
		{/if}

		<!-- Q&A bubbles -->
		{#if chat.length > 0}
			<h2 class="text-muted mt-8 mb-3 text-sm font-semibold tracking-wide uppercase">
				Rückfragen zum Artikel
			</h2>
			<div class="space-y-3">
				{#each chat as msg, i (i)}
					{#if msg.role === 'user'}
						<div class="flex justify-end">
							<div
								class="accent-soft max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed"
							>
								{msg.content}
							</div>
						</div>
					{:else}
						<div class="flex justify-start">
							<div
								class="article-body max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed {msg.error
									? 'border border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
									: 'card'}"
							>
								{#if msg.content}
									<!-- eslint-disable-next-line svelte/no-at-html-tags -->
									{@html renderMarkdown(msg.content)}
								{:else}
									<span class="inline-flex gap-1">
										<span class="animate-pulse">●</span>
										<span class="animate-pulse [animation-delay:150ms]">●</span>
										<span class="animate-pulse [animation-delay:300ms]">●</span>
									</span>
								{/if}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
		<div bind:this={chatEnd}></div>
	</div>
</div>

<!-- sticky question bar -->
<div
	class="fixed inset-x-0 bottom-0 bottom-fade pt-8 pb-[max(1rem,env(safe-area-inset-bottom))]"
>
	<form onsubmit={ask} class="mx-auto flex max-w-3xl items-center gap-2 px-4">
		<!-- mobile back button; on desktop the one on the hero image is used -->
		<a href="/" aria-label="Zurück zur Übersicht" class="icon-btn flex h-11 w-11 shrink-0 rounded-full sm:hidden">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
			</svg>
		</a>
		<input
			bind:value={question}
			type="text"
			placeholder={data.aiConfigured
				? 'Frage zur News stellen …'
				: 'Verbinde zuerst eine KI in den Einstellungen'}
			disabled={!data.aiConfigured || sending}
			class="input h-11 min-w-0 flex-1 rounded-full px-4 disabled:opacity-60"
		/>
		<button
			type="submit"
			disabled={!data.aiConfigured || sending || !question.trim()}
			aria-label="Frage senden"
			class="btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M6 12 3.3 4.6c-.2-.6.4-1.2 1-.9l16.2 7.4c.6.3.6 1.1 0 1.4L4.3 19.9c-.6.3-1.2-.3-1-.9L6 12zm0 0h6"
				/>
			</svg>
		</button>
	</form>
</div>
