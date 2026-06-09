<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Tab = 'kategorien' | 'loeschen' | 'ki';
	const initialTab = page.url.searchParams.get('tab');
	let tab: Tab = $state(
		initialTab === 'loeschen' || initialTab === 'ki' ? (initialTab as Tab) : 'kategorien'
	);

	let showAddCategory = $state(false);
	let editingCategory: string | null = $state(null);
	let addingTopicFor: string | null = $state(null);
	let editingTopic: string | null = $state(null);

	const claudeConfig = $derived(
		JSON.stringify(
			{
				mcpServers: {
					news: {
						command: 'npx',
						args: ['-y', 'mcp-remote', data.mcpUrl, '--header', 'Authorization: Bearer <DEIN_TOKEN>']
					}
				}
			},
			null,
			2
		)
	);

	const researchPrompt = `Hole über das News-MCP meine Interessen (get_interests) und prüfe mit list_recent_articles, was bereits vorhanden ist. Recherchiere dann im Web die wichtigsten aktuellen Nachrichten zu jeder Kategorie und jedem Hot Topic, prüfe Fakten über mehrere Quellen hinweg und speichere jeden Artikel mit save_article (Headline, Teaser, ausführlicher Artikel in Markdown, Bild-URL aus einer Quelle, alle Quellen).`;

	const inputClass =
		'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-teal-400';
	const labelClass = 'mb-1 block text-xs font-medium text-slate-400';

	function closeEditors() {
		showAddCategory = false;
		editingCategory = null;
		addingTopicFor = null;
		editingTopic = null;
	}
</script>

<svelte:head><title>Einstellungen – News</title></svelte:head>

<div class="mx-auto min-h-dvh max-w-3xl px-4 pb-28">
	<header class="flex items-center gap-3 py-5">
		<a
			href="/"
			aria-label="Zurück"
			class="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-slate-600"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
			</svg>
		</a>
		<h1 class="text-lg font-bold">Einstellungen</h1>
		<span class="flex-1"></span>
		<form method="POST" action="/logout">
			<button type="submit" class="text-sm text-slate-400 transition hover:text-red-400">
				Abmelden
			</button>
		</form>
	</header>

	<!-- tabs -->
	<div class="grid grid-cols-3 gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
		{#each [['kategorien', 'Kategorien'], ['loeschen', 'Löschintervall'], ['ki', 'KI & MCP']] as [id, label] (id)}
			<button
				type="button"
				onclick={() => {
					tab = id as Tab;
					closeEditors();
				}}
				class="rounded-lg py-2 text-sm font-medium transition {tab === id
					? 'bg-teal-500 text-slate-950'
					: 'text-slate-400 hover:text-slate-200'}"
			>
				{label}
			</button>
		{/each}
	</div>

	{#if form?.error}
		<p class="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{form.error}</p>
	{/if}

	<!-- ============ Tab 1: categories ============ -->
	{#if tab === 'kategorien'}
		<div class="mt-5 space-y-3">
			{#if data.categories.length === 0}
				<p class="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
					Noch keine Kategorien. Lege deine erste Interessen-Kategorie an – Titel für die Tags,
					Beschreibung als Recherche-Auftrag für die KI.
				</p>
			{/if}

			{#each data.categories as cat (cat.id)}
				<details class="group rounded-2xl border border-slate-800 bg-slate-900/60">
					<summary class="flex cursor-pointer items-center gap-3 p-4 select-none [&::-webkit-details-marker]:hidden">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-90">
							<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
						</svg>
						<div class="min-w-0 flex-1">
							<p class="font-semibold">{cat.title}</p>
							{#if cat.description}
								<p class="truncate text-xs text-slate-500">{cat.description}</p>
							{/if}
						</div>
						<span class="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
							{cat.topics.length} Topics
						</span>
					</summary>

					<div class="border-t border-slate-800 p-4">
						{#if editingCategory === cat.id}
							<form method="POST" action="?/updateCategory" use:enhance={() => async ({ update }) => { closeEditors(); await update(); }} class="space-y-3">
								<input type="hidden" name="id" value={cat.id} />
								<div>
									<span class={labelClass}>Kurzer Titel (Tag)</span>
									<input name="title" required maxlength="40" value={cat.title} class={inputClass} />
								</div>
								<div>
									<span class={labelClass}>Was interessiert dich? (Beschreibung für die KI)</span>
									<textarea name="description" rows="3" class={inputClass}>{cat.description}</textarea>
								</div>
								<div class="flex gap-2">
									<button type="submit" class="rounded-lg bg-teal-500 px-4 py-1.5 text-sm font-semibold text-slate-950">Speichern</button>
									<button type="button" onclick={() => (editingCategory = null)} class="rounded-lg border border-slate-700 px-4 py-1.5 text-sm text-slate-300">Abbrechen</button>
								</div>
							</form>
						{:else}
							{#if cat.description}
								<p class="mb-3 text-sm leading-relaxed text-slate-400">{cat.description}</p>
							{/if}
							<div class="mb-4 flex gap-2">
								<button type="button" onclick={() => { closeEditors(); editingCategory = cat.id; }} class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500">✏️ Bearbeiten</button>
								<form method="POST" action="?/deleteCategory" use:enhance>
									<input type="hidden" name="id" value={cat.id} />
									<button
										type="submit"
										onclick={(e) => { if (!confirm(`Kategorie „${cat.title}" samt aller Artikel löschen?`)) e.preventDefault(); }}
										class="rounded-lg border border-red-900/60 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:border-red-500"
									>
										🗑 Löschen
									</button>
								</form>
							</div>
						{/if}

						<!-- topics -->
						<p class="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Hot Topics</p>
						<ul class="space-y-2">
							{#each cat.topics as topic (topic.id)}
								<li class="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									{#if editingTopic === topic.id}
										<form method="POST" action="?/updateTopic" use:enhance={() => async ({ update }) => { closeEditors(); await update(); }} class="space-y-2">
											<input type="hidden" name="id" value={topic.id} />
											<input name="title" required maxlength="40" value={topic.title} class={inputClass} />
											<textarea name="description" rows="2" placeholder="Beschreibung für die KI" class={inputClass}>{topic.description}</textarea>
											<div class="flex gap-2">
												<button type="submit" class="rounded-lg bg-teal-500 px-3 py-1 text-xs font-semibold text-slate-950">Speichern</button>
												<button type="button" onclick={() => (editingTopic = null)} class="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300">Abbrechen</button>
											</div>
										</form>
									{:else}
										<div class="flex items-center gap-2">
											<div class="min-w-0 flex-1">
												<p class="text-sm font-medium">{topic.title}</p>
												{#if topic.description}
													<p class="truncate text-xs text-slate-500">{topic.description}</p>
												{/if}
											</div>
											<button type="button" aria-label="Topic bearbeiten" onclick={() => { closeEditors(); editingTopic = topic.id; }} class="shrink-0 rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-slate-500">✏️</button>
											<form method="POST" action="?/deleteTopic" use:enhance>
												<input type="hidden" name="id" value={topic.id} />
												<button
													type="submit"
													aria-label="Topic löschen"
													onclick={(e) => { if (!confirm(`Hot Topic „${topic.title}" löschen?`)) e.preventDefault(); }}
													class="shrink-0 rounded-lg border border-red-900/60 px-2 py-1 text-xs text-red-400 transition hover:border-red-500"
												>
													🗑
												</button>
											</form>
										</div>
									{/if}
								</li>
							{/each}
						</ul>

						{#if addingTopicFor === cat.id}
							<form method="POST" action="?/addTopic" use:enhance={() => async ({ update }) => { closeEditors(); await update(); }} class="mt-3 space-y-2 rounded-xl border border-teal-900/50 bg-slate-950/60 p-3">
								<input type="hidden" name="categoryId" value={cat.id} />
								<input name="title" required maxlength="40" placeholder="Kurzer Titel, z. B. Claude" class={inputClass} />
								<textarea name="description" rows="2" placeholder="Was interessiert dich daran? (für die KI)" class={inputClass}></textarea>
								<div class="flex gap-2">
									<button type="submit" class="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-950">Hinzufügen</button>
									<button type="button" onclick={() => (addingTopicFor = null)} class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300">Abbrechen</button>
								</div>
							</form>
						{:else}
							<button type="button" onclick={() => { closeEditors(); addingTopicFor = cat.id; }} class="mt-3 w-full rounded-xl border border-dashed border-slate-700 py-2 text-sm text-slate-400 transition hover:border-teal-500 hover:text-teal-300">
								+ Hot Topic hinzufügen
							</button>
						{/if}
					</div>
				</details>
			{/each}
		</div>

		<!-- sticky add-category button -->
		<div class="fixed inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-8 pb-4">
			<div class="mx-auto max-w-3xl px-4">
				{#if showAddCategory}
					<form method="POST" action="?/addCategory" use:enhance={() => async ({ update }) => { closeEditors(); await update(); }} class="space-y-2 rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-xl">
						<input name="title" required maxlength="40" placeholder="Kurzer Titel, z. B. AI" class={inputClass} />
						<textarea name="description" rows="2" placeholder="Was interessiert dich? z. B. Neuigkeiten zu KI-Modellen, Tools und Forschung" class={inputClass}></textarea>
						<div class="flex gap-2">
							<button type="submit" class="flex-1 rounded-xl bg-teal-500 py-2 text-sm font-semibold text-slate-950">Kategorie anlegen</button>
							<button type="button" onclick={() => (showAddCategory = false)} class="rounded-xl border border-slate-700 px-4 text-sm text-slate-300">Abbrechen</button>
						</div>
					</form>
				{:else}
					<button type="button" onclick={() => { closeEditors(); showAddCategory = true; }} class="w-full rounded-2xl bg-teal-500 py-3 text-sm font-bold text-slate-950 shadow-xl transition hover:bg-teal-400">
						+ Kategorie hinzufügen
					</button>
				{/if}
			</div>
		</div>
	{/if}

	<!-- ============ Tab 2: retention ============ -->
	{#if tab === 'loeschen'}
		<div class="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
			<h2 class="font-semibold">Automatisches Löschen</h2>
			<p class="mt-1 text-sm leading-relaxed text-slate-400">
				Artikel werden nach dieser Anzahl Tage automatisch gelöscht. Gemerkte Artikel (★) sind
				ausgenommen. Unabhängig davon werden alle Artikel, die älter als 12 Monate sind, entfernt.
			</p>
			<form method="POST" action="?/setRetention" use:enhance class="mt-4 flex items-end gap-3">
				<div>
					<span class={labelClass}>Tage</span>
					<input name="days" type="number" min="1" max="365" required value={data.deleteAfterDays} class="{inputClass} w-28" />
				</div>
				<button type="submit" class="rounded-xl bg-teal-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-400">
					Speichern
				</button>
				{#if form && 'retentionSaved' in form && form.retentionSaved}
					<span class="pb-2 text-sm text-teal-400">Gespeichert ✓</span>
				{/if}
			</form>
		</div>
	{/if}

	<!-- ============ Tab 3: AI + MCP ============ -->
	{#if tab === 'ki'}
		<div class="mt-5 space-y-5">
			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
				<h2 class="font-semibold">KI für Artikel-Rückfragen</h2>
				<p class="mt-1 text-sm leading-relaxed text-slate-400">
					OpenAI-kompatible API für den Chat unter den Artikeln – funktioniert mit Claude
					(<code class="text-xs">https://api.anthropic.com/v1</code>), OpenAI, Ollama
					(<code class="text-xs">http://host:11434/v1</code>), LM Studio u. a.
				</p>
				<form method="POST" action="?/saveAi" use:enhance class="mt-4 space-y-3">
					<div>
						<span class={labelClass}>Base-URL</span>
						<input name="baseUrl" type="url" placeholder="https://api.anthropic.com/v1" value={data.ai.baseUrl} class={inputClass} />
					</div>
					<div>
						<span class={labelClass}>Modell</span>
						<input name="model" placeholder="claude-sonnet-4-6" value={data.ai.model} class={inputClass} />
					</div>
					<div>
						<span class={labelClass}>API-Key {data.ai.hasApiKey ? '(gespeichert – leer lassen zum Behalten)' : ''}</span>
						<input name="apiKey" type="password" placeholder={data.ai.hasApiKey ? '••••••••' : 'sk-…'} autocomplete="off" class={inputClass} />
					</div>
					<div class="flex items-center gap-3">
						<button type="submit" class="rounded-xl bg-teal-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-400">
							Speichern
						</button>
						{#if form && 'aiSaved' in form && form.aiSaved}
							<span class="text-sm text-teal-400">Gespeichert ✓</span>
						{/if}
					</div>
				</form>
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
				<h2 class="font-semibold">MCP-Server</h2>
				<p class="mt-1 text-sm leading-relaxed text-slate-400">
					Über den MCP-Server holt sich deine KI (Claude Desktop, lokales LLM-Setup) deine
					Interessen und speichert recherchierte Artikel zurück in die App.
				</p>
				<div class="mt-3 rounded-xl bg-slate-950 p-3">
					<p class="text-xs text-slate-500">Endpoint (Streamable HTTP)</p>
					<code class="text-sm break-all text-teal-300">{data.mcpUrl}</code>
				</div>

				<h3 class="mt-5 text-sm font-semibold">Zugriffstokens</h3>
				{#if form && 'newToken' in form && form.newToken}
					<div class="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
						<p class="text-xs font-medium text-amber-300">
							Token „{form.newTokenLabel}" – jetzt kopieren, er wird nur einmal angezeigt:
						</p>
						<code class="mt-1 block text-sm break-all text-amber-200 select-all">{form.newToken}</code>
					</div>
				{/if}
				<ul class="mt-2 space-y-2">
					{#each data.tokens as token (token.id)}
						<li class="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{token.label}</p>
								<p class="text-xs text-slate-500">
									{token.prefix}… · {token.lastUsedAt ? `zuletzt genutzt ${new Date(token.lastUsedAt).toLocaleDateString('de-DE')}` : 'noch nie genutzt'}
								</p>
							</div>
							<form method="POST" action="?/deleteToken" use:enhance>
								<input type="hidden" name="id" value={token.id} />
								<button
									type="submit"
									onclick={(e) => { if (!confirm(`Token „${token.label}" widerrufen?`)) e.preventDefault(); }}
									class="rounded-lg border border-red-900/60 px-2.5 py-1 text-xs text-red-400 transition hover:border-red-500"
								>
									Widerrufen
								</button>
							</form>
						</li>
					{/each}
				</ul>
				<form method="POST" action="?/createToken" use:enhance class="mt-3 flex gap-2">
					<input name="label" maxlength="60" placeholder="Name, z. B. Claude Desktop" class={inputClass} />
					<button type="submit" class="shrink-0 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-400">
						Token erstellen
					</button>
				</form>

				<h3 class="mt-6 text-sm font-semibold">Claude Desktop einrichten</h3>
				<p class="mt-1 text-sm text-slate-400">
					Entweder als Custom Connector (Settings → Connectors → URL + Token) oder per
					<code class="text-xs">mcp-remote</code> in der <code class="text-xs">claude_desktop_config.json</code>:
				</p>
				<pre class="mt-2 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs leading-relaxed text-slate-300">{claudeConfig}</pre>

				<h3 class="mt-6 text-sm font-semibold">Recherche-Prompt (Vorlage)</h3>
				<p class="mt-1 text-sm text-slate-400">
					MCP liefert die News nicht von allein – starte die Recherche mit diesem Prompt (oder
					automatisiere ihn, z. B. als wiederkehrende Aufgabe):
				</p>
				<div class="mt-2 rounded-xl bg-slate-950 p-3 text-xs leading-relaxed text-slate-300 select-all">
					{researchPrompt}
				</div>
			</div>
		</div>
	{/if}
</div>
