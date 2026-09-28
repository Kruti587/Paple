<script lang="ts">
	interface Props {
		zoneLabel?: string;
	}

	let { zoneLabel = '' }: Props = $props();

	let visible = $state(false);
	let currentDisplayed = $state('');
	let hideTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (zoneLabel && zoneLabel !== currentDisplayed) {
			currentDisplayed = zoneLabel;
			visible = true;
			if (hideTimer) clearTimeout(hideTimer);
			hideTimer = setTimeout(() => {
				visible = false;
			}, 2600);
		}
	});
</script>

{#if currentDisplayed}
	<div class="zone-banner" class:visible>
		<div class="zone-tag">ENTERING</div>
		<div class="zone-name">{currentDisplayed}</div>
	</div>
{/if}

<style>
	.zone-banner {
		position: fixed;
		bottom: 36px;
		left: 36px;
		pointer-events: none;
		z-index: 1000;
		opacity: 0;
		transform: translateY(16px);
		transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.zone-banner.visible {
		opacity: 1;
		transform: translateY(0);
	}

	.zone-tag {
		font-family: system-ui, -apple-system, sans-serif;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.22em;
		color: #f7b731;
		text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8), 0 0 2px #000;
		text-transform: uppercase;
	}

	.zone-name {
		font-family: 'Outfit', 'Inter', system-ui, -apple-system, sans-serif;
		font-size: clamp(1.8rem, 4vw, 2.6rem);
		font-weight: 900;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #ffffff;
		text-shadow:
			0 2px 4px rgba(0, 0, 0, 0.9),
			0 4px 16px rgba(0, 0, 0, 0.8),
			0 0 2px rgba(0, 0, 0, 0.9);
		line-height: 1;
	}
</style>
