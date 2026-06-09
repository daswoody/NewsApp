<script lang="ts">
	import { enhance } from '$app/forms';
	import StarButton from '$lib/components/StarButton.svelte';
	import { shortDate } from '$lib/dates';
	import { renderMarkdown } from '$lib/markdown';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const tag = $derived(
		data.topicTitle ? `${data.categoryTitle} / ${data.topicTitle}` : data.categoryTitle
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

<div class="mx-auto min-h-dvh max-w-3xl pb-36">
	<!-- hero image with fade-out and title overlay -->
	<div class="relative">
		<div class="relative aspect-[16/10] w-full overflow-hidden bg-slate-900 sm:aspect-[16/8]">
			{#if data.article.imagePath}
				<img
					src={`/images/${data.article.imagePath}`}
					alt=""
					class="h-full w-full object-cover"
				/>
			{:else}
				<div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-teal-950 text-6xl">
					📰
				</div>
			{/if}
			<div class="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
		</div>
		<a
			href="/"
			aria-label="Zurück zur Übersicht"
			class="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/70 text-slate-200 backdrop-blur transition hover:bg-slate-800"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
			</svg>
		</a>
		<h1 class="absolute right-4 bottom-4 left-4 text-2xl leading-tight font-extrabold text-white drop-shadow sm:text-3xl">
			{data.article.headline}
		</h1>
	</div>

	<div class="px-4">
		<!-- meta row -->
		<div class="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
			<span>{shortDate(data.article.publishedAt)}</span>
			<span class="text-slate-700">•</span>
			<span class="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-xs font-medium text-teal-300">{tag}</span>
			<span class="flex-1"></span>
			<StarButton
				articleId={data.article.id}
				saved={data.article.saved}
				action="?/toggleSave"
			/>
			{#if !data.article.hasTopic}
				<form method="POST" action="?/makeTopic" use:enhance>
					<button
						type="submit"
						title="Erzeugt ein Hot Topic zu diesem Thema, damit künftig mehr News dazu erscheinen"
						class="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-teal-400 hover:text-teal-300"
					>
						+ Als Sub-Topic festlegen
					</button>
				</form>
			{/if}
		</div>
		{#if form && 'topicCreated' in form && form.topicCreated}
			<p class="mt-2 rounded-lg bg-teal-500/10 px-3 py-2 text-sm text-teal-300">
				Sub-Topic „{form.topicCreated}" angelegt – künftige Recherchen liefern mehr News dazu.
			</p>
		{/if}

		<!-- article body -->
		<div class="article-body mt-6 text-[0.97rem] text-slate-200">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- rendered by our escaping markdown renderer -->
			{@html data.bodyHtml}
		</div>

		<!-- sources -->
		{#if data.sources.length > 0}
			<h2 class="mt-8 mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">Quellen</h2>
			<div class="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
				{#each data.sources as source (source.id)}
					<a
						href={source.url}
						target="_blank"
						rel="noopener noreferrer"
						class="w-56 shrink-0 rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-600"
					>
						<p class="truncate text-sm font-semibold text-slate-200">{source.name}</p>
						<p class="mt-1 truncate text-xs text-slate-500">{source.url}</p>
						<p class="mt-3 text-xs font-medium text-teal-400">Quelle öffnen ↗</p>
					</a>
				{/each}
			</div>
		{/if}

		<!-- Q&A bubbles -->
		{#if chat.length > 0}
			<h2 class="mt-8 mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">
				Rückfragen zum Artikel
			</h2>
			<div class="space-y-3">
				{#each chat as msg, i (i)}
					{#if msg.role === 'user'}
						<div class="flex justify-end">
							<div class="max-w-[85%] rounded-2xl rounded-br-md bg-teal-500/20 px-4 py-2.5 text-sm leading-relaxed text-teal-100">
								{msg.content}
							</div>
						</div>
					{:else}
						<div class="flex justify-start">
							<div
								class="article-body max-w-[85%] rounded-2xl rounded-bl-md border px-4 py-2.5 text-sm leading-relaxed {msg.error
									? 'border-red-500/30 bg-red-500/10 text-red-300'
									: 'border-slate-800 bg-slate-900 text-slate-200'}"
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
<div class="fixed inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-8 pb-4">
	<form onsubmit={ask} class="mx-auto flex max-w-3xl items-center gap-2 px-4">
		<a
			href="/"
			aria-label="Zurück zur Übersicht"
			class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-slate-500"
		>
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
			class="h-11 min-w-0 flex-1 rounded-full border border-slate-700 bg-slate-900 px-4 text-sm outline-none placeholder:text-slate-500 focus:border-teal-400 disabled:opacity-60"
		/>
		<button
			type="submit"
			disabled={!data.aiConfigured || sending || !question.trim()}
			aria-label="Frage senden"
			class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-500 text-slate-950 transition hover:bg-teal-400 disabled:opacity-40"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.3 4.6c-.2-.6.4-1.2 1-.9l16.2 7.4c.6.3.6 1.1 0 1.4L4.3 19.9c-.6.3-1.2-.3-1-.9L6 12zm0 0h6" />
			</svg>
		</button>
	</form>
</div>
