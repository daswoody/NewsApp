<script lang="ts">
	import { enhance } from '$app/forms';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const labelClass = 'mb-1 block text-xs font-medium text-muted';

	const toggleClass = (on: boolean) =>
		`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-teal-600 dark:bg-teal-500' : 'bg-stone-300 dark:bg-slate-700'}`;
	const knobClass = (on: boolean) =>
		`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[1.4rem]' : 'left-0.5'}`;
</script>

<svelte:head><title>Admin – News</title></svelte:head>

<div class="mx-auto min-h-dvh max-w-3xl px-4 pb-16">
	<header class="flex items-center gap-3 py-5">
		<a href="/settings" aria-label="Zurück zu den Einstellungen" class="icon-btn h-10 w-10">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
			</svg>
		</a>
		<h1 class="font-display text-lg font-bold">Admin-Panel</h1>
		<span class="flex-1"></span>
		<ThemeToggle />
	</header>

	{#if form?.error}
		<p class="mb-4 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
			{form.error}
		</p>
	{/if}

	<!-- instance settings -->
	<div class="card space-y-4 p-5">
		<h2 class="font-semibold">Instanz-Einstellungen</h2>

		<form method="POST" action="?/toggleRegistration" use:enhance class="flex items-center gap-3">
			<button type="submit" role="switch" aria-checked={data.allowRegistration} aria-label="Registrierung umschalten" class={toggleClass(data.allowRegistration)}>
				<span class={knobClass(data.allowRegistration)}></span>
			</button>
			<div>
				<p class="text-sm font-medium">Offene Registrierung</p>
				<p class="text-faint text-xs">Neue Nutzer können sich selbst registrieren. Accounts anlegen kannst du unten immer.</p>
			</div>
		</form>

		<form method="POST" action="?/toggleAiGlobal" use:enhance class="flex items-center gap-3">
			<button type="submit" role="switch" aria-checked={data.aiGlobal} aria-label="Zentrale KI umschalten" class={toggleClass(data.aiGlobal)}>
				<span class={knobClass(data.aiGlobal)}></span>
			</button>
			<div>
				<p class="text-sm font-medium">KI-Verbindung zentral verwalten</p>
				<p class="text-faint text-xs">
					Eine gemeinsame KI für den Artikel-Chat aller Nutzer (unten konfigurieren). Aus = jeder
					Nutzer hinterlegt seine eigene KI in den Einstellungen.
				</p>
			</div>
		</form>

		<form method="POST" action="?/toggleMcpGlobal" use:enhance class="flex items-center gap-3">
			<button type="submit" role="switch" aria-checked={data.mcpGlobal} aria-label="MCP-Familienmodus umschalten" class={toggleClass(data.mcpGlobal)}>
				<span class={knobClass(data.mcpGlobal)}></span>
			</button>
			<div>
				<p class="text-sm font-medium">MCP-Familienmodus</p>
				<p class="text-faint text-xs">
					Admin-Tokens recherchieren für alle Accounts: get_interests liefert die Interessen jedes
					Nutzers, save_article ordnet Artikel über die Kategorie automatisch zu. Aus = jeder Token
					wirkt nur für den eigenen Account.
				</p>
			</div>
		</form>
	</div>

	<!-- global AI config -->
	{#if data.aiGlobal}
		<div class="card mt-5 p-5">
			<h2 class="font-semibold">Zentrale KI-Verbindung</h2>
			<p class="text-muted mt-1 text-sm">
				OpenAI-kompatible API, gilt für den Artikel-Chat aller Nutzer (Claude, OpenAI, Ollama, LM Studio …).
			</p>
			<form method="POST" action="?/saveGlobalAi" use:enhance class="mt-4 space-y-3">
				<div>
					<span class={labelClass}>Base-URL</span>
					<input name="baseUrl" type="url" placeholder="https://api.anthropic.com/v1" value={data.globalAi.baseUrl} class="input" />
				</div>
				<div>
					<span class={labelClass}>Modell</span>
					<input name="model" placeholder="claude-sonnet-4-6" value={data.globalAi.model} class="input" />
				</div>
				<div>
					<span class={labelClass}>API-Key {data.globalAi.hasApiKey ? '(gespeichert – leer lassen zum Behalten)' : ''}</span>
					<input name="apiKey" type="password" placeholder={data.globalAi.hasApiKey ? '••••••••' : 'sk-…'} autocomplete="off" class="input" />
				</div>
				<div class="flex items-center gap-3">
					<button type="submit" class="btn-primary px-5 py-2 text-sm">Speichern</button>
					{#if form && 'aiSaved' in form && form.aiSaved}
						<span class="text-sm text-teal-700 dark:text-teal-400">Gespeichert ✓</span>
					{/if}
				</div>
			</form>
		</div>
	{/if}

	<!-- user management -->
	<div class="card mt-5 p-5">
		<h2 class="font-semibold">Nutzer ({data.users.length})</h2>
		<ul class="mt-3 space-y-2">
			{#each data.users as user (user.id)}
				<li class="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/60">
					<div class="min-w-0 flex-1">
						<p class="flex items-center gap-2 text-sm font-medium">
							{user.nickname}
							{#if user.isAdmin}
								<span class="rounded-md bg-teal-700/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-teal-800 uppercase dark:bg-teal-500/15 dark:text-teal-300">Admin</span>
							{/if}
							{#if user.id === data.selfId}
								<span class="text-faint text-xs">(du)</span>
							{/if}
						</p>
						<p class="text-faint truncate text-xs">
							{user.email} · seit {new Date(user.createdAt).toLocaleDateString('de-DE')}
						</p>
					</div>
					{#if user.id !== data.selfId}
						<form method="POST" action="?/deleteUser" use:enhance>
							<input type="hidden" name="id" value={user.id} />
							<button
								type="submit"
								onclick={(e) => { if (!confirm(`Account „${user.nickname}" (${user.email}) samt aller Daten löschen?`)) e.preventDefault(); }}
								class="btn-danger px-2.5 py-1 text-xs"
							>
								Löschen
							</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>

		<h3 class="mt-5 text-sm font-semibold">Nutzer anlegen</h3>
		{#if form && 'userCreated' in form && form.userCreated}
			<p class="mt-2 rounded-lg bg-teal-700/10 px-3 py-2 text-sm text-teal-800 dark:bg-teal-500/10 dark:text-teal-300">
				Account „{form.userCreated}" wurde angelegt.
			</p>
		{/if}
		<form method="POST" action="?/createUser" use:enhance class="mt-2 space-y-3">
			<div class="grid gap-3 sm:grid-cols-3">
				<div>
					<span class={labelClass}>Spitzname</span>
					<input name="nickname" required maxlength="60" class="input" />
				</div>
				<div>
					<span class={labelClass}>E-Mail</span>
					<input name="email" type="email" required class="input" />
				</div>
				<div>
					<span class={labelClass}>Passwort (min. 8 Zeichen)</span>
					<input name="password" type="password" required minlength="8" autocomplete="new-password" class="input" />
				</div>
			</div>
			<button type="submit" class="btn-primary px-5 py-2 text-sm">Anlegen</button>
		</form>
	</div>
</div>
