<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head><title>Registrieren – News</title></svelte:head>

<main class="flex min-h-dvh items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div class="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-700/10 text-3xl dark:bg-teal-500/15">📰</div>
			<h1 class="font-display text-2xl font-bold">Account erstellen</h1>
			<p class="text-muted mt-1 text-sm">Deine persönlichen, KI-recherchierten News.</p>
		</div>

		<form method="POST" use:enhance class="card space-y-4 p-6">
			{#if form?.error}
				<p class="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{form.error}</p>
			{/if}
			<label class="block">
				<span class="text-muted mb-1 block text-sm font-medium">Spitzname</span>
				<input name="nickname" type="text" required maxlength="60" autocomplete="nickname" value={form?.nickname ?? ''} class="input py-2.5" />
			</label>
			<label class="block">
				<span class="text-muted mb-1 block text-sm font-medium">E-Mail</span>
				<input name="email" type="email" required autocomplete="email" value={form?.email ?? ''} class="input py-2.5" />
			</label>
			<label class="block">
				<span class="text-muted mb-1 block text-sm font-medium">Passwort</span>
				<input name="password" type="password" required minlength="8" autocomplete="new-password" class="input py-2.5" />
				<span class="text-faint mt-1 block text-xs">Mindestens 8 Zeichen</span>
			</label>
			<button type="submit" class="btn-primary w-full py-2.5 text-sm">Registrieren</button>
		</form>

		<p class="text-muted mt-4 text-center text-sm">
			Schon einen Account?
			<a href="/login" class="font-medium text-teal-700 hover:underline dark:text-teal-400">Anmelden</a>
		</p>
	</div>
</main>
