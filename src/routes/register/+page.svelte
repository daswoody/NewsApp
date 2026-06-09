<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head><title>Registrieren – News</title></svelte:head>

<main class="flex min-h-dvh items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<div class="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/15 text-3xl">📰</div>
			<h1 class="text-2xl font-bold">Account erstellen</h1>
			<p class="mt-1 text-sm text-slate-400">Deine persönlichen, KI-recherchierten News.</p>
		</div>

		<form method="POST" use:enhance class="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
			{#if form?.error}
				<p class="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{form.error}</p>
			{/if}
			<label class="block">
				<span class="mb-1 block text-sm font-medium text-slate-300">Spitzname</span>
				<input
					name="nickname"
					type="text"
					required
					maxlength="60"
					autocomplete="nickname"
					value={form?.nickname ?? ''}
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
				/>
			</label>
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
					minlength="8"
					autocomplete="new-password"
					class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
				/>
				<span class="mt-1 block text-xs text-slate-500">Mindestens 8 Zeichen</span>
			</label>
			<button
				type="submit"
				class="w-full rounded-xl bg-teal-500 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-teal-400"
			>
				Registrieren
			</button>
		</form>

		<p class="mt-4 text-center text-sm text-slate-400">
			Schon einen Account?
			<a href="/login" class="font-medium text-teal-400 hover:underline">Anmelden</a>
		</p>
	</div>
</main>
