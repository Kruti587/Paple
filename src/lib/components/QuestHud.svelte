<script lang="ts">
	import type { GameUi } from '$lib/game/game';

	let {
		ui,
		toast,
		shout,
		showPostIt,
		banner
	}: {
		ui: GameUi;
		toast: string | null;
		shout: string | null;
		showPostIt: boolean;
		banner: 'caught' | 'complete' | null;
	} = $props();
</script>

{#if ui.space === 'in' || ui.chasing}
	<div class="objective" class:urgent={ui.chasing} class:done={ui.stage === 'complete'}>
		<div class="label">ANAKIN HQ Security</div>
		<div class="text">
			{ui.objective}
			{#if ui.distance !== null}<span class="meta">· {ui.distance} m</span>{/if}
			{#if ui.floor !== null}<span class="floor">Floor {ui.floor}</span>{/if}
		</div>
		{#if ui.hint}<div class="hint">{ui.hint}</div>{/if}
	</div>
{/if}

{#if ui.hasPostIt && ui.stage !== 'complete'}
	<div class="inventory" title="The stolen post-it">
		<div class="mini-postit">CODE<br /><b>{ui.code}</b></div>
	</div>
{/if}

{#if showPostIt}
	<div class="postit-popup">
		<div class="postit">
			<span>CODE</span>
			<b>{ui.code}</b>
		</div>
		<div class="caption">Got it! Remember the code…</div>
	</div>
{/if}

{#if shout}
	<div class="shout">{shout}</div>
{/if}

{#if ui.prompt}
	{@const [before, after] = ui.prompt.split(' E ')}
	<div class="prompt">{before} <kbd>E</kbd> {after}</div>
{/if}

{#if toast}
	<div class="toast">{toast}</div>
{/if}

{#if banner === 'caught'}
	<div class="banner caught">
		<strong>CAUGHT!</strong>
		<span>They snatched the post-it back. Try again — and sprint!</span>
	</div>
{:else if banner === 'complete'}
	<div class="banner complete">
		<strong>QUEST COMPLETE</strong>
		<span>The Post-it Heist</span>
	</div>
{/if}

<style>
	.objective {
		position: absolute;
		top: 1rem;
		left: 50%;
		transform: translateX(-50%);
		max-width: min(90vw, 34rem);
		padding: 0.55rem 1rem;
		border: 3px solid #363a3c;
		border-radius: 0.8rem;
		box-shadow: 0 4px 0 #363a3c;
		background: #fffaf0;
		color: #363a3c;
		text-align: center;
		font-family: system-ui, sans-serif;
		pointer-events: none;
	}
	.objective.urgent {
		background: #ffe1e1;
		animation: pulse 0.9s ease-in-out infinite;
	}
	.objective.done {
		background: #eaffdc;
	}
	@keyframes pulse {
		50% {
			transform: translateX(-50%) scale(1.04);
		}
	}
	.label {
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: 0.7rem;
		color: #6d4bd8;
	}
	.text {
		font-weight: 700;
		font-size: 1.05rem;
	}
	.meta {
		font-weight: 500;
		opacity: 0.7;
	}
	.floor {
		margin-left: 0.4rem;
		padding: 0.05rem 0.45rem;
		border-radius: 0.4rem;
		background: #6d4bd8;
		color: white;
		font-size: 0.85rem;
	}
	.hint {
		font-size: 0.85rem;
		opacity: 0.8;
	}
	.inventory {
		position: absolute;
		left: 1rem;
		bottom: 1rem;
		pointer-events: none;
	}
	.mini-postit,
	.postit {
		background: #ffe066;
		color: #1d2a6b;
		font-family: 'Segoe Print', 'Comic Sans MS', cursive;
		box-shadow: 0 4px 10px rgb(0 0 0 / 0.25);
		text-align: center;
	}
	.mini-postit {
		width: 4.6rem;
		padding: 0.5rem 0.3rem;
		transform: rotate(-4deg);
		font-size: 0.75rem;
		line-height: 1.2;
	}
	.mini-postit b {
		font-size: 1.15rem;
	}
	.postit-popup {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 0.8rem;
		pointer-events: none;
		animation: pop 0.35s cubic-bezier(0.2, 1.6, 0.4, 1);
	}
	@keyframes pop {
		from {
			transform: scale(0.3);
			opacity: 0;
		}
	}
	.postit {
		display: grid;
		width: 13rem;
		padding: 1.4rem 1rem;
		transform: rotate(-3deg);
	}
	.postit span {
		font-size: 1.3rem;
	}
	.postit b {
		font-size: 3rem;
		letter-spacing: 0.1em;
	}
	.caption {
		padding: 0.3rem 0.8rem;
		border-radius: 999px;
		background: rgb(54 58 60 / 0.85);
		color: white;
		font:
			600 0.95rem system-ui,
			sans-serif;
	}
	.shout {
		position: absolute;
		top: 6.5rem;
		left: 50%;
		transform: translateX(-50%) rotate(-2deg);
		padding: 0.6rem 1.2rem;
		border: 3px solid #363a3c;
		border-radius: 1.2rem;
		background: #ffffff;
		color: #c0392b;
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: 1.3rem;
		pointer-events: none;
		animation: shake 0.3s ease-in-out 3;
	}
	@keyframes shake {
		25% {
			transform: translateX(-52%) rotate(-4deg);
		}
		75% {
			transform: translateX(-48%) rotate(1deg);
		}
	}
	.prompt,
	.toast {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		padding: 0.5rem 1rem;
		border-radius: 999px;
		color: white;
		font:
			600 1rem system-ui,
			sans-serif;
		pointer-events: none;
	}
	.prompt {
		bottom: 2rem;
		background: rgb(54 58 60 / 0.9);
	}
	.toast {
		bottom: 5rem;
		background: #c0392b;
	}
	.prompt :global(kbd) {
		padding: 0 0.35rem;
		border-radius: 0.25rem;
		background: white;
		color: #363a3c;
		font-family: inherit;
	}
	.banner {
		position: absolute;
		top: 40%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: grid;
		justify-items: center;
		gap: 0.3rem;
		padding: 1rem 2rem;
		border: 4px solid #363a3c;
		border-radius: 1rem;
		box-shadow: 0 6px 0 #363a3c;
		font-family: system-ui, sans-serif;
		pointer-events: none;
		animation: pop 0.4s cubic-bezier(0.2, 1.6, 0.4, 1);
	}
	.banner strong {
		font-family: 'Bungee', 'Arial Black', sans-serif;
		font-size: 2.2rem;
		font-weight: 400;
	}
	.banner.caught {
		background: #ffdede;
		color: #8a1c1c;
	}
	.banner.complete {
		background: #ffe98a;
		color: #363a3c;
	}
</style>
