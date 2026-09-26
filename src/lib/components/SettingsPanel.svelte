<script lang="ts">
	import { TRACK_NAMES, type Track } from '$lib/audio/music';

	let {
		music,
		track,
		onmusic,
		ontrack,
		onclose
	}: {
		music: boolean;
		track: Track;
		onmusic: (on: boolean) => void;
		ontrack: (track: Track) => void;
		onclose: () => void;
	} = $props();

	const tracks = Object.keys(TRACK_NAMES) as Track[];
</script>

<div
	class="backdrop"
	role="presentation"
	onclick={(e) => e.target === e.currentTarget && onclose()}
	onkeydown={(e) => e.key === 'Escape' && onclose()}
>
	<div class="panel" role="dialog" aria-label="Settings">
		<h2>Settings</h2>

		<div class="row">
			<span>Music</span>
			<div class="toggle" role="radiogroup" aria-label="Music">
				<button class:on={music} aria-pressed={music} onclick={() => onmusic(true)}>On</button>
				<button class:on={!music} aria-pressed={!music} onclick={() => onmusic(false)}>Off</button>
			</div>
		</div>

		<div class="row" class:dim={!music}>
			<span>Track</span>
			<div class="toggle" role="radiogroup" aria-label="Track">
				{#each tracks as t (t)}
					<button class:on={track === t} aria-pressed={track === t} onclick={() => ontrack(t)}>
						{TRACK_NAMES[t]}
					</button>
				{/each}
			</div>
		</div>

		<button class="done" onclick={onclose}>Done</button>
	</div>
</div>

<style>
	.backdrop {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: rgb(20 24 30 / 0.45);
		z-index: 20;
	}
	.panel {
		width: min(90vw, 22rem);
		padding: 1.4rem;
		border: 3px solid #363a3c;
		border-radius: 1rem;
		box-shadow: 0 6px 0 #363a3c;
		background: #fffaf0;
		color: #363a3c;
		font-family: system-ui, sans-serif;
	}
	h2 {
		margin: 0 0 1.2rem;
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-weight: 400;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-weight: 600;
		font-size: 1.1rem;
	}
	.row + .row {
		margin-top: 0.9rem;
	}
	.row.dim {
		opacity: 0.5;
	}
	.toggle {
		display: flex;
		border: 2px solid #363a3c;
		border-radius: 999px;
		overflow: hidden;
	}
	.toggle button {
		padding: 0.4rem 1rem;
		border: none;
		background: transparent;
		color: #363a3c;
		font:
			700 0.95rem system-ui,
			sans-serif;
		cursor: pointer;
	}
	.toggle button.on {
		background: #6d4bd8;
		color: #ffffff;
	}
	.done {
		width: 100%;
		margin-top: 1.4rem;
		padding: 0.6rem;
		border: 3px solid #363a3c;
		border-radius: 0.7rem;
		box-shadow: 0 4px 0 #363a3c;
		background: #ffc15e;
		color: #363a3c;
		font-family: 'Bungee', 'Arial Black', sans-serif;
		cursor: pointer;
	}
</style>
