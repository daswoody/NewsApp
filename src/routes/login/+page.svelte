<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Anmelden – News</title></svelte:head>

<main class="flex min-h-dvh items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div class="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl accent-soft text-3xl">📰</div>
			<h1 class="font-display text-2xl">Willkommen zurück</h1>
			<p class="text-muted mt-1 text-sm">Melde dich an, um deine News zu lesen.</p>
		</div>

		<form method="POST" use:enhance class="card space-y-4 p-6">
			{#if form?.error}
				<p class="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{form.error}</p>
			{/if}
			<label class="block">
				<span class="text-muted mb-1 block text-sm font-medium">E-Mail</span>
				<input name="email" type="email" required autocomplete="email" value={form?.email ?? ''} class="input py-2.5" />
			</label>
			<label class="block">
				<span class="text-muted mb-1 block text-sm font-medium">Passwort</span>
				<input name="password" type="password" required autocomplete="current-password" class="input py-2.5" />
			</label>
			<button type="submit" class="btn-primary w-full py-2.5 text-sm">Anmelden</button>
		</form>

		{#if data.allowRegistration}
			<p class="text-muted mt-4 text-center text-sm">
				Noch kein Account?
				<a href="/register" class="font-medium text-accent hover:underline">Registrieren</a>
			</p>
		{/if}
	</div>
</main>
