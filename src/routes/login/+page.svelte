<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head><title>Anmelden – News</title></svelte:head>

<main class="flex min-h-dvh items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div class="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/15 text-3xl">📰</div>
			<h1 class="text-2xl font-bold">Willkommen zurück</h1>
			<p class="mt-1 text-sm text-slate-400">Melde dich an, um deine News zu lesen.</p>
		</div>

		<form method="POST" use:enhance class="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			{#if form?.error}
				<p class="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{form.error}</p>
			{/if}
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-300">E-Mail</span>
				<input
					name="email"
					type="email"
					required
					autocomplete="email"
					value={form?.email ?? ''}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
				/>
			</label>
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-300">Passwort</span>
				<input
					name="password"
					type="password"
					required
					autocomplete="current-password"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
				/>
			</label>
			<button
				type="submit"
				class="w-full rounded-xl bg-teal-500 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-teal-400"
			>
				Anmelden
			</button>
		</form>

		{#if data.allowRegistration}
			<p class="mt-4 text-center text-sm text-slate-400">
				Noch kein Account?
				<a href="/register" class="font-medium text-teal-400 hover:underline">Registrieren</a>
			</p>
		{/if}
	</div>
</main>
