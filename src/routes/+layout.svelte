<script lang="ts">
	import '@fontsource/bungee';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Paple</title>
</svelte:head>

{@render children()}
