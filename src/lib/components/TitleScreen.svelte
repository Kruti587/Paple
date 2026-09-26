<script lang="ts">
	let {
		ready,
		onplay,
		onsettings
	}: { ready: boolean; onplay: () => void; onsettings: () => void } = $props();
</script>

<div class="title-screen">
	<div class="card">
		<h1 aria-label="Paple">
			{#each 'PAPLE' as letter, i (i)}
				<span style="--i: {i}">{letter}</span>
			{/each}
		</h1>
		<p class="tagline">A tiny planet. A big city. One stolen post-it.</p>

		<div class="buttons">
			<button class="play" onclick={onplay} disabled={!ready}>
				{ready ? '▶ Play' : 'Loading…'}
			</button>
			<button class="settings" onclick={onsettings}>⚙ Settings</button>
		</div>
	</div>
</div>

<style>
	.title-screen {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		pointer-events: none;
		/* Soft vignette so the letters pop over the spinning planet */
		background: radial-gradient(ellipse at center, rgb(0 0 0 / 0) 35%, rgb(20 30 40 / 0.35) 100%);
	}
	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.2rem;
		pointer-events: auto;
	}
	h1 {
		margin: 0;
		display: flex;
		gap: 0.08em;
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: clamp(4rem, 14vw, 10rem);
		line-height: 1;
		letter-spacing: 0.02em;
	}
	h1 span {
		display: inline-block;
		color: #ffffff;
		/* Messenger-style chunky logo: dark ink edge + offset drop shadow */
		-webkit-text-stroke: 0.06em #363a3c;
		paint-order: stroke fill;
		text-shadow: 0.07em 0.09em 0 #363a3c;
		animation: bob 2.6s ease-in-out infinite;
		animation-delay: calc(var(--i) * 0.14s);
	}
	@keyframes bob {
		0%,
		100% {
			transform: translateY(0) rotate(-2deg);
		}
		50% {
			transform: translateY(-0.08em) rotate(2deg);
		}
	}
	.tagline {
		margin: 0;
		padding: 0.35rem 0.9rem;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.8);
		color: #363a3c;
		font:
			600 1rem system-ui,
			sans-serif;
	}
	.buttons {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		width: 15rem;
	}
	button {
		padding: 0.8rem 1rem;
		border: 3px solid #363a3c;
		border-radius: 0.9rem;
		box-shadow: 0 5px 0 #363a3c;
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: 1.25rem;
		cursor: pointer;
		transition:
			transform 0.08s,
			box-shadow 0.08s;
	}
	button:active:not(:disabled) {
		transform: translateY(4px);
		box-shadow: 0 1px 0 #363a3c;
	}
	.play {
		background: #ffc15e;
		color: #363a3c;
	}
	.play:disabled {
		background: #e3e3e3;
		color: #8a8a8a;
		cursor: wait;
	}
	.settings {
		background: #ffffff;
		color: #363a3c;
		font-size: 1rem;
	}
</style>
