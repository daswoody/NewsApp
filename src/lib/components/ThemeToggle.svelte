<script lang="ts">
	let dark = $state(false);

	$effect(() => {
		dark = document.documentElement.classList.contains('dark');
	});

	function toggle() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		document.cookie = `theme=${dark ? 'dark' : 'light'}; path=/; max-age=31536000; SameSite=Lax`;
		// recolor the browser chrome (Android status bar) immediately
		const meta = document.querySelector('meta[name="theme-color"]');
		const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
		if (meta && bg) meta.setAttribute('content', bg);
	}
</script>

<button
	type="button"
	onclick={toggle}
	aria-label={dark ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'}
	title={dark ? 'Light Mode' : 'Dark Mode'}
	class="icon-btn h-10 w-10"
>
	{#if dark}
		<!-- sun -->
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="h-5 w-5">
			<circle cx="12" cy="12" r="4" />
			<path
				stroke-linecap="round"
				d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.4-6.4-1.4 1.4M7 17l-1.4 1.4M18.4 18.4 17 17M7 7 5.6 5.6"
			/>
		</svg>
	{:else}
		<!-- moon -->
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" class="h-5 w-5">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"
			/>
		</svg>
	{/if}
</button>
