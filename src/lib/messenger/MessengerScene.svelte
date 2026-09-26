<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import NpcDialogue from '$lib/components/NpcDialogue.svelte';
	import { npcConfig } from '$lib/npcConfig';
	import { createWorld } from '$lib/world/createWorld';
	import { createKeyboard } from '$lib/world/input';
	import { attachViewControls } from '$lib/world/player';
	import { createNpcPicker } from './npcPicker';

	let canvas: HTMLCanvasElement;
	let loading = $state(true);

	// --- NPC dialogue ---
	let activeNpcId = $state<string | null>(null);
	let nearbyNpcId = $state<string | null>(null);
	const activeNpc = $derived(activeNpcId ? npcConfig[activeNpcId] : undefined);
	const nearbyNpc = $derived(nearbyNpcId ? npcConfig[nearbyNpcId] : undefined);

	const openDialogue = (npcId: string) => {
		if (npcId in npcConfig) activeNpcId = npcId;
	};

	onMount(() => {
		let disposed = false;
		let cleanup = () => {};

		// Let the loading overlay paint before the (synchronous) world build.
		requestAnimationFrame(() => {
			if (disposed) return;
			const world = createWorld(canvas, Object.keys(npcConfig));
			const keyboard = createKeyboard();

			const resize = () => world.resize(canvas.clientWidth, canvas.clientHeight);
			resize();
			window.addEventListener('resize', resize);

			const onKey = (e: KeyboardEvent) => {
				if (e.target instanceof HTMLInputElement) {
					if (e.code === 'Escape') activeNpcId = null;
					return;
				}
				if (e.code === 'KeyE' && nearbyNpcId && !activeNpcId) {
					e.preventDefault();
					keyboard.reset();
					openDialogue(nearbyNpcId);
				} else if (e.code === 'Escape') activeNpcId = null;
			};
			window.addEventListener('keydown', onKey);

			const disposeView = attachViewControls(canvas, world.player);
			const disposePicker = createNpcPicker(canvas, world.camera, world.npcObjects, openDialogue);

			const timer = new THREE.Timer();
			timer.connect(document);
			const loop = (time: number) => {
				timer.update(time);
				const dt = Math.min(timer.getDelta(), 0.1);
				const elapsed = timer.getElapsed();
				world.update(dt, elapsed, keyboard.read());
				const near = world.nearbyNpc();
				if (near !== nearbyNpcId) nearbyNpcId = near;
				world.render(elapsed);
			};
			world.setAnimationLoop(loop);
			loading = false;

			cleanup = () => {
				world.setAnimationLoop(null);
				timer.dispose();
				disposePicker();
				disposeView();
				keyboard.dispose();
				window.removeEventListener('resize', resize);
				window.removeEventListener('keydown', onKey);
				world.dispose();
			};
		});

		return () => {
			disposed = true;
			cleanup();
		};
	});
</script>

<div class="root">
	<canvas bind:this={canvas}></canvas>

	{#if loading}
		<div class="loading">Building Bengaluru…</div>
	{:else}
		<div class="hint">
			<strong>Namma Planet</strong>
			<span>WASD to walk · Shift to run · drag to look · scroll to zoom</span>
		</div>
		{#if nearbyNpc && !activeNpcId}
			<div class="prompt">Press <kbd>E</kbd> or click to talk to {nearbyNpc.name}</div>
		{/if}
	{/if}

	{#if activeNpcId && activeNpc}
		<NpcDialogue
			npcId={activeNpcId}
			npcName={activeNpc.name}
			open={true}
			onclose={() => (activeNpcId = null)}
		/>
	{/if}
</div>

<style>
	.root {
		position: fixed;
		inset: 0;
		background: #7fc4c6;
		font-family: system-ui, sans-serif;
	}
	canvas {
		width: 100%;
		height: 100%;
		display: block;
		touch-action: none;
	}
	.loading {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: #363a3c;
		font-size: 1.4rem;
		font-weight: 600;
	}
	.hint {
		position: absolute;
		top: 1rem;
		left: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.6rem 0.9rem;
		border-radius: 0.6rem;
		background: rgb(255 255 255 / 0.75);
		color: #363a3c;
		font-size: 0.85rem;
	}
	.prompt {
		position: absolute;
		left: 50%;
		bottom: 2rem;
		transform: translateX(-50%);
		padding: 0.5rem 1rem;
		border-radius: 999px;
		background: rgb(54 58 60 / 0.85);
		color: white;
	}
	kbd {
		padding: 0 0.35rem;
		border-radius: 0.25rem;
		background: white;
		color: #363a3c;
		font-family: inherit;
	}
</style>
