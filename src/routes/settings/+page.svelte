<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Tab = 'kategorien' | 'konto' | 'ki';
	const initialTab = page.url.searchParams.get('tab');
	let tab: Tab = $state(
		initialTab === 'konto' || initialTab === 'loeschen'
			? 'konto'
			: initialTab === 'ki'
				? 'ki'
				: 'kategorien'
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

	const researchPrompt = `Du bist mein persönlicher News-Redakteur. Erstelle jetzt meine heutige News-Ausgabe über das News-MCP.

Ablauf:
1. Rufe get_interests auf. Du erhältst alle Kategorien und Hot Topics mit Beschreibungen – die Beschreibungen definieren, was mich interessiert. (Enthält die Antwort mehrere Nutzer, bearbeite jeden Nutzer separat nach denselben Regeln.)
2. Rufe list_recent_articles mit days: 3 auf und merke dir die vorhandenen Headlines. Nachrichten, die inhaltlich schon abgedeckt sind, legst du nicht erneut an.
3. Recherchiere für jede Kategorie und jedes Hot Topic im Web die relevanten Nachrichten der letzten 24–48 Stunden.
4. Gruppiere die Funde: Meldungen zum selben Ereignis bzw. derselben Story aus mehreren Quellen fasst du zu EINEM Artikel zusammen. Thematisch unterschiedliche Meldungen bekommen jeweils einen eigenen Artikel.
5. Faktencheck: Prüfe Kernaussagen nach Möglichkeit über mindestens zwei unabhängige Quellen und bevorzuge Primärquellen und etablierte Medien. Was sich nicht bestätigen lässt, kennzeichnest du als unbestätigt oder lässt es weg.
6. Speichere jeden Artikel mit save_article – maximal 5 neue Artikel pro Kategorie (Hot-Topic-Artikel zählen mit). Gibt es mehr Kandidaten, priorisiere nach Relevanz für meine Interessen.

Artikelformat für save_article:
- category_id / topic_id: IDs aus get_interests; passt der Artikel zu einem Hot Topic, gib die topic_id mit an.
- headline: prägnant und sachlich, kein Clickbait.
- summary: 2–3 Sätze Teaser für die News-Karte.
- content: ausführlicher Artikel in Markdown (ca. 300–600 Wörter) mit Zwischenüberschriften: Was ist passiert? Kontext/Hintergrund. Einordnung. Fachlicher, sachlicher Schreibstil – keine Spekulationen, keine Meinung. Passende YouTube-Links auf eigener Zeile werden als Video eingebettet.
- image_url: eine direkte Bild-Datei-URL aus einer der Quellen (z. B. das og:image), nicht die Artikelseite. Meldet die Antwort image_cached: false, suche eine andere Bild-URL und reiche sie mit update_article nach.
- sources: alle tatsächlich verwendeten Quellen mit Name und URL.
- published_at: Datum des Ereignisses (ISO 8601), falls bekannt.

Zum Abschluss gib mir eine kurze Übersicht: pro Kategorie die angelegten Artikel (Headlines) und was du übersprungen hast (Duplikate oder zu dünn belegt).`;

	const labelClass = 'mb-1 block text-xs font-medium text-muted';

	function closeEditors() {
		showAddCategory = false;
		editingCategory = null;
		addingTopicFor = null;
		editingTopic = null;
	}
</script>

<svelte:head><title>Einstellungen – News</title></svelte:head>

<div class="mx-auto min-h-dvh max-w-3xl px-4 pb-32">
	<header class="flex items-center gap-3 py-5">
		<a href="/" aria-label="Zurück" class="icon-btn h-10 w-10">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
			</svg>
		</a>
		<h1 class="font-display text-lg">Einstellungen</h1>
		<span class="flex-1"></span>
		<ThemeToggle />
		{#if data.isAdmin}
			<a href="/admin" class="btn-ghost px-3 py-2 text-sm font-medium">Admin</a>
		{/if}
		<form method="POST" action="/logout">
			<button type="submit" class="text-muted text-sm transition hover:text-red-500">Abmelden</button>
		</form>
	</header>

	<!-- tabs -->
	<div class="card grid grid-cols-3 gap-1 p-1">
		{#each [['kategorien', 'Kategorien'], ['konto', 'Konto'], ['ki', 'KI & MCP']] as [id, label] (id)}
			<button
				type="button"
				onclick={() => {
					tab = id as Tab;
					closeEditors();
				}}
				class="rounded-xl py-2 text-sm font-medium transition {tab === id
					? 'bg-[var(--text)] text-[var(--bg)]'
					: 'text-muted hover:text-[var(--text)]'}"
			>
				{label}
			</button>
		{/each}
	</div>

	{#if form?.error}
		<p class="mt-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
			{form.error}
		</p>
	{/if}

	<!-- ============ Tab 1: categories ============ -->
	{#if tab === 'kategorien'}
		<div class="mt-5 space-y-3">
			{#if data.categories.length === 0}
				<p class="text-muted rounded-xl border-token border border-dashed p-6 text-center text-sm">
					Noch keine Kategorien. Lege deine erste Interessen-Kategorie an – Titel für die Tags,
					Beschreibung als Recherche-Auftrag für die KI.
				</p>
			{/if}

			{#each data.categories as cat, catIndex (cat.id)}
				<details class="card group">
					<summary class="flex cursor-pointer items-center gap-3 p-4 select-none [&::-webkit-details-marker]:hidden">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-faint h-4 w-4 shrink-0 transition group-open:rotate-90">
							<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
						</svg>
						<div class="min-w-0 flex-1">
							<p class="font-semibold">{cat.title}</p>
							{#if cat.description}
								<p class="text-faint truncate text-xs">{cat.description}</p>
							{/if}
						</div>
						<span class="text-muted shrink-0 bg-soft rounded-full px-2 py-0.5 text-xs">
							{cat.topics.length} Topics
						</span>
						<span class="flex shrink-0 flex-col gap-0.5">
							<form method="POST" action="?/moveCategory" use:enhance>
								<input type="hidden" name="id" value={cat.id} />
								<input type="hidden" name="dir" value="up" />
								<button type="submit" disabled={catIndex === 0} aria-label="Nach oben" class="text-faint block px-1 leading-none transition hover:text-[var(--accent)] disabled:opacity-30">▲</button>
							</form>
							<form method="POST" action="?/moveCategory" use:enhance>
								<input type="hidden" name="id" value={cat.id} />
								<input type="hidden" name="dir" value="down" />
								<button type="submit" disabled={catIndex === data.categories.length - 1} aria-label="Nach unten" class="text-faint block px-1 leading-none transition hover:text-[var(--accent)] disabled:opacity-30">▼</button>
							</form>
						</span>
					</summary>

					<div class="border-token border-t p-4">
						{#if editingCategory === cat.id}
							<form method="POST" action="?/updateCategory" use:enhance={() => async ({ update }) => { closeEditors(); await update(); }} class="space-y-3">
								<input type="hidden" name="id" value={cat.id} />
								<div>
									<span class={labelClass}>Kurzer Titel (Tag)</span>
									<input name="title" required maxlength="40" value={cat.title} class="input" />
								</div>
								<div>
									<span class={labelClass}>Was interessiert dich? (Beschreibung für die KI)</span>
									<textarea name="description" rows="3" class="input">{cat.description}</textarea>
								</div>
								<div class="flex gap-2">
									<button type="submit" class="btn-primary px-4 py-1.5 text-sm">Speichern</button>
									<button type="button" onclick={() => (editingCategory = null)} class="btn-ghost px-4 py-1.5 text-sm">Abbrechen</button>
								</div>
							</form>
						{:else}
							{#if cat.description}
								<p class="text-muted mb-3 text-sm leading-relaxed">{cat.description}</p>
							{/if}
							<div class="mb-4 flex gap-2">
								<button type="button" onclick={() => { closeEditors(); editingCategory = cat.id; }} class="btn-ghost px-3 py-1.5 text-xs font-medium">✏️ Bearbeiten</button>
								<form method="POST" action="?/deleteCategory" use:enhance>
									<input type="hidden" name="id" value={cat.id} />
									<button
										type="submit"
										onclick={(e) => { if (!confirm(`Kategorie „${cat.title}" samt aller Artikel löschen?`)) e.preventDefault(); }}
										class="btn-danger px-3 py-1.5 text-xs font-medium"
									>
										🗑 Löschen
									</button>
								</form>
							</div>
						{/if}

						<!-- topics -->
						<p class="text-faint mb-2 text-xs font-semibold tracking-wide uppercase">Hot Topics</p>
						<ul class="space-y-2">
							{#each cat.topics as topic, topicIndex (topic.id)}
								<li class="subcard p-3">
									{#if editingTopic === topic.id}
										<form method="POST" action="?/updateTopic" use:enhance={() => async ({ update }) => { closeEditors(); await update(); }} class="space-y-2">
											<input type="hidden" name="id" value={topic.id} />
											<input name="title" required maxlength="40" value={topic.title} class="input" />
											<textarea name="description" rows="2" placeholder="Beschreibung für die KI" class="input">{topic.description}</textarea>
											<div class="flex gap-2">
												<button type="submit" class="btn-primary px-3 py-1 text-xs">Speichern</button>
												<button type="button" onclick={() => (editingTopic = null)} class="btn-ghost px-3 py-1 text-xs">Abbrechen</button>
											</div>
										</form>
									{:else}
										<div class="flex items-center gap-2">
											<span class="flex shrink-0 flex-col gap-0.5">
												<form method="POST" action="?/moveTopic" use:enhance>
													<input type="hidden" name="id" value={topic.id} />
													<input type="hidden" name="dir" value="up" />
													<button type="submit" disabled={topicIndex === 0} aria-label="Nach oben" class="text-faint block px-1 text-xs leading-none transition hover:text-[var(--accent)] disabled:opacity-30">▲</button>
												</form>
												<form method="POST" action="?/moveTopic" use:enhance>
													<input type="hidden" name="id" value={topic.id} />
													<input type="hidden" name="dir" value="down" />
													<button type="submit" disabled={topicIndex === cat.topics.length - 1} aria-label="Nach unten" class="text-faint block px-1 text-xs leading-none transition hover:text-[var(--accent)] disabled:opacity-30">▼</button>
												</form>
											</span>
											<div class="min-w-0 flex-1">
												<p class="text-sm font-medium">{topic.title}</p>
												{#if topic.description}
													<p class="text-faint truncate text-xs">{topic.description}</p>
												{/if}
											</div>
											<button type="button" aria-label="Topic bearbeiten" onclick={() => { closeEditors(); editingTopic = topic.id; }} class="btn-ghost shrink-0 px-2 py-1 text-xs">✏️</button>
											<form method="POST" action="?/deleteTopic" use:enhance>
												<input type="hidden" name="id" value={topic.id} />
												<button
													type="submit"
													aria-label="Topic löschen"
													onclick={(e) => { if (!confirm(`Hot Topic „${topic.title}" löschen?`)) e.preventDefault(); }}
													class="btn-danger shrink-0 px-2 py-1 text-xs"
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
							<form method="POST" action="?/addTopic" use:enhance={() => async ({ update }) => { closeEditors(); await update(); }} class="mt-3 space-y-2 rounded-xl border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-soft p-3">
								<input type="hidden" name="categoryId" value={cat.id} />
								<input name="title" required maxlength="40" placeholder="Kurzer Titel, z. B. Claude" class="input" />
								<textarea name="description" rows="2" placeholder="Was interessiert dich daran? (für die KI)" class="input"></textarea>
								<div class="flex gap-2">
									<button type="submit" class="btn-primary px-3 py-1.5 text-xs">Hinzufügen</button>
									<button type="button" onclick={() => (addingTopicFor = null)} class="btn-ghost px-3 py-1.5 text-xs">Abbrechen</button>
								</div>
							</form>
						{:else}
							<button type="button" onclick={() => { closeEditors(); addingTopicFor = cat.id; }} class="text-muted mt-3 w-full rounded-xl border-token border border-dashed py-2 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
								+ Hot Topic hinzufügen
							</button>
						{/if}
					</div>
				</details>
			{/each}
		</div>

		<!-- sticky add-category button -->
		<div class="fixed inset-x-0 bottom-0 bottom-fade pt-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
			<div class="mx-auto max-w-3xl px-4">
				{#if showAddCategory}
					<form method="POST" action="?/addCategory" use:enhance={() => async ({ update }) => { closeEditors(); await update(); }} class="card border-token space-y-2 border p-4">
						<input name="title" required maxlength="40" placeholder="Kurzer Titel, z. B. AI" class="input" />
						<textarea name="description" rows="2" placeholder="Was interessiert dich? z. B. Neuigkeiten zu KI-Modellen, Tools und Forschung" class="input"></textarea>
						<div class="flex gap-2">
							<button type="submit" class="btn-primary flex-1 py-2 text-sm">Kategorie anlegen</button>
							<button type="button" onclick={() => (showAddCategory = false)} class="btn-ghost px-4 text-sm">Abbrechen</button>
						</div>
					</form>
				{:else}
					<button type="button" onclick={() => { closeEditors(); showAddCategory = true; }} class="btn-primary w-full rounded-2xl py-3 text-sm font-bold">
						+ Kategorie hinzufügen
					</button>
				{/if}
			</div>
		</div>
	{/if}

	<!-- ============ Tab 2: account ============ -->
	{#if tab === 'konto'}
		<div class="mt-5 space-y-5">
			<div class="card p-5">
				<h2 class="font-semibold">Automatisches Löschen</h2>
				<p class="text-muted mt-1 text-sm leading-relaxed">
					Artikel werden nach dieser Anzahl Tage automatisch gelöscht. Gemerkte Artikel (★) sind
					ausgenommen. Unabhängig davon werden alle Artikel, die älter als 12 Monate sind, entfernt.
				</p>
				<form method="POST" action="?/setRetention" use:enhance={() => async ({ update }) => update({ reset: false })} class="mt-4 flex items-end gap-3">
					<div>
						<span class={labelClass}>Tage</span>
						<input name="days" type="number" min="1" max="365" required value={data.deleteAfterDays} class="input w-28" />
					</div>
					<button type="submit" class="btn-primary px-5 py-2 text-sm">Speichern</button>
					{#if form && 'retentionSaved' in form && form.retentionSaved}
						<span class="pb-2 text-sm text-accent">Gespeichert ✓</span>
					{/if}
				</form>
			</div>

			<div class="card p-5">
				<h2 class="font-semibold">Profil</h2>
				<form method="POST" action="?/updateProfile" use:enhance={() => async ({ update }) => update({ reset: false })} class="mt-3 flex items-end gap-3">
					<div class="flex-1">
						<span class={labelClass}>Spitzname</span>
						<input name="nickname" required maxlength="60" value={data.nickname} class="input" />
					</div>
					<button type="submit" class="btn-primary px-5 py-2 text-sm">Speichern</button>
					{#if form && 'profileSaved' in form && form.profileSaved}
						<span class="pb-2 text-sm text-accent">✓</span>
					{/if}
				</form>
				<p class="text-faint mt-2 text-xs">Angemeldet als {data.email}</p>
			</div>

			<div class="card p-5">
				<h2 class="font-semibold">Passwort ändern</h2>
				<form method="POST" action="?/changePassword" use:enhance class="mt-3 space-y-3">
					<div>
						<span class={labelClass}>Aktuelles Passwort</span>
						<input name="current" type="password" required autocomplete="current-password" class="input" />
					</div>
					<div>
						<span class={labelClass}>Neues Passwort (min. 8 Zeichen)</span>
						<input name="next" type="password" required minlength="8" autocomplete="new-password" class="input" />
					</div>
					<div class="flex items-center gap-3">
						<button type="submit" class="btn-primary px-5 py-2 text-sm">Passwort ändern</button>
						{#if form && 'passwordSaved' in form && form.passwordSaved}
							<span class="text-sm text-accent">Geändert ✓</span>
						{/if}
					</div>
				</form>
			</div>

			<div class="card border border-red-200 p-5 dark:border-red-900/50">
				<h2 class="font-semibold text-red-600 dark:text-red-400">Account löschen</h2>
				<p class="text-muted mt-1 text-sm leading-relaxed">
					Löscht deinen Account dauerhaft – inklusive aller Kategorien, Artikel, Chats und Tokens.
					Das kann nicht rückgängig gemacht werden.
				</p>
				<form
					method="POST"
					action="?/deleteAccount"
					use:enhance
					class="mt-3 flex items-end gap-3"
				>
					<div class="flex-1">
						<span class={labelClass}>Passwort zur Bestätigung</span>
						<input name="password" type="password" required autocomplete="current-password" class="input" />
					</div>
					<button
						type="submit"
						onclick={(e) => { if (!confirm('Account und alle Daten endgültig löschen?')) e.preventDefault(); }}
						class="btn-danger px-5 py-2 text-sm font-medium"
					>
						Endgültig löschen
					</button>
				</form>
			</div>
		</div>
	{/if}

	<!-- ============ Tab 3: AI + MCP ============ -->
	{#if tab === 'ki'}
		<div class="mt-5 space-y-5">
			{#if data.groupName}
				<div class="card p-5">
					<h2 class="font-semibold">Von deiner Gruppe verwaltet</h2>
					<p class="text-muted mt-1 text-sm leading-relaxed">
						Du bist Mitglied der Gruppe <strong class="text-accent">{data.groupName}</strong>.
						Die KI-Verbindung für Artikel-Rückfragen und die MCP-Recherche werden zentral über die
						Gruppe verwaltet – du musst hier nichts einstellen.
						{#if data.isAdmin}
							Konfigurieren kannst du beides im <a href="/admin" class="text-accent underline">Admin-Panel</a>.
						{/if}
					</p>
				</div>
			{:else}
			<div class="card p-5">
				<h2 class="font-semibold">KI für Artikel-Rückfragen</h2>
				<p class="text-muted mt-1 text-sm leading-relaxed">
					OpenAI-kompatible API für den Chat unter den Artikeln – funktioniert mit Claude
					(<code class="text-xs">https://api.anthropic.com/v1</code>), OpenAI, Ollama
					(<code class="text-xs">http://host:11434/v1</code>), LM Studio u. a.
				</p>
				<form method="POST" action="?/saveAi" use:enhance={() => async ({ update }) => update({ reset: false })} class="mt-4 space-y-3">
					<div>
						<span class={labelClass}>Base-URL</span>
						<input name="baseUrl" type="url" placeholder="https://api.anthropic.com/v1" value={data.ai.baseUrl} class="input" />
					</div>
					<div>
						<span class={labelClass}>Modell</span>
						<input name="model" placeholder="claude-sonnet-4-6" value={data.ai.model} class="input" />
					</div>
					<div>
						<span class={labelClass}>API-Key {data.ai.hasApiKey ? '(gespeichert – leer lassen zum Behalten)' : ''}</span>
						<input name="apiKey" type="password" placeholder={data.ai.hasApiKey ? '••••••••' : 'sk-…'} autocomplete="off" class="input" />
					</div>
					<div class="flex items-center gap-3">
						<button type="submit" class="btn-primary px-5 py-2 text-sm">Speichern</button>
						{#if form && 'aiSaved' in form && form.aiSaved}
							<span class="text-accent text-sm">Gespeichert ✓</span>
						{/if}
					</div>
				</form>
			</div>

			<div class="card p-5">
				<h2 class="font-semibold">MCP-Server</h2>
				<p class="text-muted mt-1 text-sm leading-relaxed">
					Über den MCP-Server holt sich deine KI (Claude Desktop, lokales LLM-Setup) deine
					Interessen und speichert recherchierte Artikel zurück in die App.
				</p>
				<div class="bg-soft mt-3 rounded-xl p-3">
					<p class="text-faint text-xs">Endpoint (Streamable HTTP)</p>
					<code class="text-sm break-all text-accent">{data.mcpUrl}</code>
				</div>

				<h3 class="mt-5 text-sm font-semibold">Zugriffstokens</h3>
				{#if form && 'newToken' in form && form.newToken}
					<div class="mt-2 rounded-xl border border-amber-400/60 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
						<p class="text-xs font-medium text-amber-700 dark:text-amber-300">
							Token „{form.newTokenLabel}" – jetzt kopieren, er wird nur einmal angezeigt:
						</p>
						<code class="mt-1 block text-sm break-all text-amber-800 select-all dark:text-amber-200">{form.newToken}</code>
						<p class="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">
							Connector-URL für Claude Desktop (Custom Connector, ohne Authentifizierung):
						</p>
						<code class="mt-1 block text-sm break-all text-amber-800 select-all dark:text-amber-200">{data.mcpUrl}/{form.newToken}</code>
					</div>
				{/if}
				<ul class="mt-2 space-y-2">
					{#each data.tokens as token (token.id)}
						<li class="subcard flex items-center gap-3 px-3 py-2">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{token.label}</p>
								<p class="text-faint text-xs">
									{token.prefix}… · {token.lastUsedAt ? `zuletzt genutzt ${new Date(token.lastUsedAt).toLocaleDateString('de-DE')}` : 'noch nie genutzt'}
								</p>
							</div>
							<form method="POST" action="?/deleteToken" use:enhance>
								<input type="hidden" name="id" value={token.id} />
								<button
									type="submit"
									onclick={(e) => { if (!confirm(`Token „${token.label}" widerrufen?`)) e.preventDefault(); }}
									class="btn-danger px-2.5 py-1 text-xs"
								>
									Widerrufen
								</button>
							</form>
						</li>
					{/each}
				</ul>
				<form method="POST" action="?/createToken" use:enhance class="mt-3 flex gap-2">
					<input name="label" maxlength="60" placeholder="Name, z. B. Claude Desktop" class="input" />
					<button type="submit" class="btn-primary shrink-0 px-4 py-2 text-sm">Token erstellen</button>
				</form>

				<h3 class="mt-6 text-sm font-semibold">Claude Desktop einrichten</h3>
				<p class="text-muted mt-1 text-sm">
					<strong class="text-[var(--text)]">Empfohlen (ohne Node.js):</strong>
					Custom Connector mit geheimer URL – Settings → Connectors → „Add custom connector", als URL
					<code class="text-xs">{data.mcpUrl}/&lt;DEIN_TOKEN&gt;</code> eintragen (wird beim
					Erstellen eines Tokens oben fertig angezeigt), keine Authentifizierung nötig.
					Die URL enthält das Geheimnis – nicht weitergeben.
				</p>
				<p class="text-muted mt-3 text-sm">
					<strong class="text-[var(--text)]">Alternative (Node.js erforderlich):</strong> per
					<code class="text-xs">mcp-remote</code> in der <code class="text-xs">claude_desktop_config.json</code>:
				</p>
				<pre class="bg-soft mt-2 overflow-x-auto rounded-xl p-3 text-xs leading-relaxed">{claudeConfig}</pre>

				<h3 class="mt-6 text-sm font-semibold">Recherche-Prompt (Vorlage)</h3>
				<p class="text-muted mt-1 text-sm">
					MCP liefert die News nicht von allein – starte die Recherche mit diesem Prompt (oder
					automatisiere ihn, z. B. als wiederkehrende Aufgabe):
				</p>
				<div class="bg-soft mt-2 rounded-xl p-3 text-xs leading-relaxed whitespace-pre-line select-all">
					{researchPrompt}
				</div>
			</div>
			{/if}
		</div>
	{/if}
</div>
