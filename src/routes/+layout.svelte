<script lang="ts">
	import '../app.css';

	let { data, children } = $props();
</script>

<svelte:head>
	<meta name="theme-color" content={data.themeColor} />
	{#if data.themeCss}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- generated from validated hex/number tokens only -->
		{@html `<style>${data.themeCss}</style>`}
	{/if}
</svelte:head>

{@render children()}
