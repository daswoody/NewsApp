<script lang="ts">
	import { enhance } from '$app/forms';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const labelClass = 'mb-1 block text-xs font-medium text-muted';

	const toggleClass = (on: boolean) =>
		`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`;
	const knobClass = (on: boolean) =>
		`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[1.4rem]' : 'left-0.5'}`;

	const ungrouped = $derived(data.users.filter((u) => !u.groupId));

	const themeModes = $derived([
		{ mode: 'light', title: 'Light Mode', theme: data.themeLight },
		{ mode: 'dark', title: 'Dark Mode', theme: data.themeDark }
	]);
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
	<div class="card p-5">
		<h2 class="font-semibold">Instanz-Einstellungen</h2>
		<form method="POST" action="?/toggleRegistration" use:enhance class="mt-4 flex items-center gap-3">
			<button type="submit" role="switch" aria-checked={data.allowRegistration} aria-label="Registrierung umschalten" class={toggleClass(data.allowRegistration)}>
				<span class={knobClass(data.allowRegistration)}></span>
			</button>
			<div>
				<p class="text-sm font-medium">Offene Registrierung</p>
				<p class="text-faint text-xs">Neue Nutzer können sich selbst registrieren. Accounts anlegen kannst du unten immer.</p>
			</div>
		</form>
	</div>

	<!-- groups -->
	<div class="card mt-5 p-5">
		<h2 class="font-semibold">Gruppen</h2>
		<p class="text-muted mt-1 text-sm leading-relaxed">
			Eine Gruppe teilt sich KI-Verbindung und MCP-Tokens: Gruppen-Tokens recherchieren für alle
			Mitglieder, der Artikel-Chat aller Mitglieder nutzt die Gruppen-KI. Nutzer ohne Gruppe
			verwalten beides selbst in ihren Einstellungen.
		</p>

		{#each data.groups as group (group.id)}
			<details class="subcard mt-3">
				<summary class="flex cursor-pointer items-center gap-3 p-3 select-none [&::-webkit-details-marker]:hidden">
					<span class="min-w-0 flex-1 truncate font-medium">{group.name}</span>
					<span class="text-faint shrink-0 text-xs">{group.members.length} Mitglieder · {group.tokens.length} Tokens</span>
					<form method="POST" action="?/deleteGroup" use:enhance>
						<input type="hidden" name="id" value={group.id} />
						<button
							type="submit"
							onclick={(e) => { if (!confirm(`Gruppe „${group.name}" auflösen? Mitglieder verwalten KI & MCP dann wieder selbst.`)) e.preventDefault(); }}
							class="btn-danger px-2.5 py-1 text-xs"
						>
							Auflösen
						</button>
					</form>
				</summary>
				<div class="space-y-4 border-t border-token p-3">
					<!-- group name + AI -->
					<form method="POST" action="?/saveGroup" use:enhance={() => async ({ update }) => update({ reset: false })} class="space-y-3">
						<input type="hidden" name="id" value={group.id} />
						<div class="grid gap-3 sm:grid-cols-2">
							<div>
								<span class={labelClass}>Name</span>
								<input name="name" required maxlength="60" value={group.name} class="input" />
							</div>
							<div>
								<span class={labelClass}>KI Base-URL</span>
								<input name="baseUrl" type="url" placeholder="https://api.anthropic.com/v1" value={group.aiBaseUrl} class="input" />
							</div>
							<div>
								<span class={labelClass}>KI Modell</span>
								<input name="model" placeholder="claude-sonnet-4-6" value={group.aiModel} class="input" />
							</div>
							<div>
								<span class={labelClass}>API-Key {group.hasApiKey ? '(gespeichert)' : ''}</span>
								<input name="apiKey" type="password" placeholder={group.hasApiKey ? '••••••••' : 'sk-…'} autocomplete="off" class="input" />
							</div>
						</div>
						<div class="flex items-center gap-3">
							<button type="submit" class="btn-primary px-4 py-1.5 text-sm">Speichern</button>
							{#if form && 'groupSaved' in form && form.groupSaved === group.id}
								<span class="text-accent text-sm">Gespeichert ✓</span>
							{/if}
						</div>
					</form>

					<!-- members -->
					<div>
						<p class="text-faint mb-2 text-xs font-semibold tracking-wide uppercase">Mitglieder</p>
						<ul class="space-y-1.5">
							{#each group.members as member (member.id)}
								<li class="flex items-center gap-2 text-sm">
									<span class="min-w-0 flex-1 truncate">{member.nickname} <span class="text-faint">({member.email})</span></span>
									<form method="POST" action="?/setUserGroup" use:enhance>
										<input type="hidden" name="userId" value={member.id} />
										<input type="hidden" name="groupId" value="" />
										<button type="submit" class="btn-ghost px-2 py-0.5 text-xs">Entfernen</button>
									</form>
								</li>
							{:else}
								<li class="text-faint text-sm">Noch keine Mitglieder.</li>
							{/each}
						</ul>
						{#if ungrouped.length > 0}
							<form method="POST" action="?/setUserGroup" use:enhance class="mt-2 flex gap-2">
								<input type="hidden" name="groupId" value={group.id} />
								<select name="userId" required class="input flex-1">
									{#each ungrouped as candidate (candidate.id)}
										<option value={candidate.id}>{candidate.nickname} ({candidate.email})</option>
									{/each}
								</select>
								<button type="submit" class="btn-ghost shrink-0 px-3 py-1.5 text-sm">+ Hinzufügen</button>
							</form>
						{/if}
					</div>

					<!-- group tokens -->
					<div>
						<p class="text-faint mb-2 text-xs font-semibold tracking-wide uppercase">MCP-Tokens der Gruppe</p>
						{#if form && 'newToken' in form && form.newToken && form.newTokenGroup === group.id}
							<div class="mb-2 rounded-xl border border-amber-400/60 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
								<p class="text-xs font-medium text-amber-700 dark:text-amber-300">
									Token „{form.newTokenLabel}" – jetzt kopieren, er wird nur einmal angezeigt:
								</p>
								<code class="mt-1 block text-sm break-all text-amber-800 select-all dark:text-amber-200">{form.newToken}</code>
								<p class="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">Connector-URL für Claude Desktop:</p>
								<code class="mt-1 block text-sm break-all text-amber-800 select-all dark:text-amber-200">{data.mcpUrl}/{form.newToken}</code>
							</div>
						{/if}
						<ul class="space-y-1.5">
							{#each group.tokens as token (token.id)}
								<li class="flex items-center gap-2 text-sm">
									<span class="min-w-0 flex-1 truncate">{token.label} <span class="text-faint">({token.prefix}…)</span></span>
									<form method="POST" action="?/deleteGroupToken" use:enhance>
										<input type="hidden" name="id" value={token.id} />
										<button
											type="submit"
											onclick={(e) => { if (!confirm(`Token „${token.label}" widerrufen?`)) e.preventDefault(); }}
											class="btn-danger px-2 py-0.5 text-xs"
										>
											Widerrufen
										</button>
									</form>
								</li>
							{:else}
								<li class="text-faint text-sm">Noch keine Tokens.</li>
							{/each}
						</ul>
						<form method="POST" action="?/createGroupToken" use:enhance class="mt-2 flex gap-2">
							<input type="hidden" name="groupId" value={group.id} />
							<input name="label" maxlength="60" placeholder="Name, z. B. Claude Desktop Familie" class="input flex-1" />
							<button type="submit" class="btn-primary shrink-0 px-3 py-1.5 text-sm">Token erstellen</button>
						</form>
					</div>
				</div>
			</details>
		{/each}

		<form method="POST" action="?/createGroup" use:enhance class="mt-3 flex gap-2">
			<input name="name" required maxlength="60" placeholder="Neue Gruppe, z. B. Familie" class="input flex-1" />
			<button type="submit" class="btn-primary shrink-0 px-4 py-2 text-sm">Gruppe anlegen</button>
		</form>
	</div>

	<!-- user management -->
	<div class="card mt-5 p-5">
		<h2 class="font-semibold">Nutzer ({data.users.length})</h2>
		<ul class="mt-3 space-y-2">
			{#each data.users as user (user.id)}
				<li class="subcard flex items-center gap-3 px-3 py-2.5">
					<div class="min-w-0 flex-1">
						<p class="flex items-center gap-2 text-sm font-medium">
							{user.nickname}
							{#if user.isAdmin}
								<span class="accent-soft rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">Admin</span>
							{/if}
							{#if user.groupId}
								<span class="bg-soft text-muted rounded-md px-1.5 py-0.5 text-[10px] font-semibold">
									{data.groups.find((g) => g.id === user.groupId)?.name}
								</span>
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
			<p class="accent-soft mt-2 rounded-lg px-3 py-2 text-sm">
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

	<!-- theme editor -->
	<div class="card mt-5 p-5">
		<div class="flex items-center gap-3">
			<h2 class="flex-1 font-semibold">Design</h2>
			{#if data.themeCustomized}
				<form method="POST" action="?/resetTheme" use:enhance>
					<button
						type="submit"
						onclick={(e) => { if (!confirm('Beide Modi auf das Standard-Design zurücksetzen?')) e.preventDefault(); }}
						class="btn-ghost px-3 py-1.5 text-xs"
					>
						Auf Standard zurücksetzen
					</button>
				</form>
			{/if}
		</div>
		<p class="text-muted mt-1 text-sm leading-relaxed">
			Farben, Eckenradius und Headline-Schrift für Light und Dark Mode. Gilt für alle Nutzer;
			Änderungen sind nach dem Speichern und Neuladen sichtbar.
		</p>

		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			{#each themeModes as { mode, title, theme } (mode)}
				<!-- reset: false keeps the color pickers filled after saving -->
				<form method="POST" action="?/saveTheme" use:enhance={() => async ({ update }) => update({ reset: false })} class="subcard space-y-3 p-3">
					<input type="hidden" name="mode" value={mode} />
					<p class="text-sm font-semibold">{title}</p>
					<div class="grid grid-cols-2 gap-2">
						<label class="block">
							<span class={labelClass}>Hintergrund</span>
							<input name="bg" type="color" value={theme.bg} class="input h-9 p-1" />
						</label>
						<label class="block">
							<span class={labelClass}>Karten</span>
							<input name="card" type="color" value={theme.card} class="input h-9 p-1" />
						</label>
						<label class="block">
							<span class={labelClass}>Text</span>
							<input name="text" type="color" value={theme.text} class="input h-9 p-1" />
						</label>
						<label class="block">
							<span class={labelClass}>Akzent</span>
							<input name="accent" type="color" value={theme.accent} class="input h-9 p-1" />
						</label>
						<label class="block">
							<span class={labelClass}>Rahmen</span>
							<input name="border" type="color" value={theme.border} class="input h-9 p-1" />
						</label>
						<label class="block">
							<span class={labelClass}>Eckenradius (px)</span>
							<input name="radius" type="number" min="0" max="32" value={theme.radius} class="input h-9" />
						</label>
					</div>
					<label class="flex items-center gap-2 text-sm">
						<input name="cardBorder" type="checkbox" checked={theme.cardBorder} class="h-4 w-4 accent-[var(--accent)]" />
						Karten mit Rahmen
					</label>
					<label class="block">
						<span class={labelClass}>Headline-Schrift</span>
						<select name="font" class="input">
							<option value="serif" selected={theme.font === 'serif'}>Serif (klassisch)</option>
							<option value="sans" selected={theme.font === 'sans'}>Sans (modern)</option>
						</select>
					</label>
					<div class="flex items-center gap-3">
						<button type="submit" class="btn-primary px-4 py-1.5 text-sm">Speichern</button>
						{#if form && 'themeSaved' in form && form.themeSaved === mode}
							<span class="text-accent text-sm">✓</span>
						{/if}
					</div>
				</form>
			{/each}
		</div>
	</div>
</div>
