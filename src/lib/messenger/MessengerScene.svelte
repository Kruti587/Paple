<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import {
		loadMusicPref,
		loadTrackPref,
		Music,
		saveMusicPref,
		saveTrackPref,
		type Track
	} from '$lib/audio/music';
	import NpcDialogue from '$lib/components/NpcDialogue.svelte';
	import QuestHud from '$lib/components/QuestHud.svelte';
	import SettingsPanel from '$lib/components/SettingsPanel.svelte';
	import Terminal from '$lib/components/Terminal.svelte';
	import TitleScreen from '$lib/components/TitleScreen.svelte';
	import { Game, type GameEvent, type GameUi } from '$lib/game/game';
	import { npcConfig } from '$lib/npcConfig';
	import { createWorld } from '$lib/world/createWorld';
	import { formatClock } from '$lib/world/dayCycle';
	import { createKeyboard } from '$lib/world/input';
	import { attachViewControls } from '$lib/world/player';
	import { fontsReady } from '$lib/world/props/signs';
	import { createNpcPicker } from './npcPicker';

	let canvas: HTMLCanvasElement;
	// Raw: never deep-proxy the game / three.js objects.
	let game = $state.raw<Game | null>(null);

	// --- Screens ---
	let phase = $state<'title' | 'playing'>('title');
	let ready = $state(false);
	let settingsOpen = $state(false);
	let musicOn = $state(loadMusicPref());
	const initialTrack = loadTrackPref();
	let track = $state<Track>(initialTrack);
	const music = new Music();
	void music.setTrack(initialTrack);

	// --- HUD ---
	let clock = $state('');
	let isNight = $state(false);
	let ui = $state<GameUi | null>(null);
	let toast = $state<string | null>(null);
	let shout = $state<string | null>(null);
	let showPostIt = $state(false);
	let banner = $state<'caught' | 'complete' | null>(null);
	let terminalOpen = $state(false);

	// --- NPC dialogue ---
	let activeNpcId = $state<string | null>(null);
	let nearbyNpcId = $state<string | null>(null);
	const activeNpc = $derived(activeNpcId ? npcConfig[activeNpcId] : undefined);
	const nearbyNpc = $derived(nearbyNpcId ? npcConfig[nearbyNpcId] : undefined);

	const openDialogue = (npcId: string) => {
		// NPC chats only outdoors, and not mid-chase.
		if (!game?.controllable || game.space !== 'out' || ui?.chasing) return;
		if (npcId in npcConfig) activeNpcId = npcId;
	};

	const timers: Record<string, ReturnType<typeof setTimeout>> = {};
	function flash(key: string, set: () => void, clear: () => void, ms: number) {
		set();
		clearTimeout(timers[key]);
		timers[key] = setTimeout(clear, ms);
	}

	function onGameEvent(e: GameEvent) {
		switch (e.type) {
			case 'toast':
				flash(
					'toast',
					() => (toast = e.text),
					() => (toast = null),
					2600
				);
				break;
			case 'shout':
				flash(
					'shout',
					() => (shout = e.text),
					() => (shout = null),
					2600
				);
				break;
			case 'postIt':
				flash(
					'postit',
					() => (showPostIt = true),
					() => (showPostIt = false),
					3000
				);
				break;
			case 'caught':
				flash(
					'banner',
					() => (banner = 'caught'),
					() => (banner = null),
					3000
				);
				break;
			case 'terminal':
				terminalOpen = true;
				break;
			case 'complete':
				break; // banner shows once the terminal finishes its "ACCESS GRANTED" lines
		}
	}

	function play() {
		if (!game || phase !== 'title') return;
		phase = 'playing';
		game.start();
		if (musicOn) void music.setEnabled(true);
	}

	function setMusic(on: boolean) {
		musicOn = on;
		saveMusicPref(on);
		// Clicking the toggle is a user gesture, so audio may start right here.
		void music.setEnabled(on);
	}

	function setTrack(t: Track) {
		track = t;
		saveTrackPref(t);
		void music.setTrack(t);
		if (!musicOn) setMusic(true); // picking a track implies you want to hear it
	}

	onMount(() => {
		let disposed = false;
		let cleanup = () => {};

		(async () => {
			// Signs are drawn with the Bungee web font; wait for it so they don't fall back.
			await fontsReady();
			// Let the title paint before the (synchronous) world build.
			await new Promise((r) => requestAnimationFrame(r));
			if (disposed) return;

			const world = createWorld(canvas, Object.keys(npcConfig));
			const g = new Game(world, onGameEvent);
			game = g;
			const keyboard = createKeyboard();

			// ?t=18.2 starts the day at 6:12 PM (handy for seeing the sunset straight away).
			const startHour = Number(new URLSearchParams(location.search).get('t'));
			if (startHour) world.setHour(startHour);

			const resize = () => g.resize(canvas.clientWidth, canvas.clientHeight);
			resize();
			window.addEventListener('resize', resize);

			const onKey = (e: KeyboardEvent) => {
				if (e.target instanceof HTMLInputElement) {
					if (e.code === 'Escape') activeNpcId = null;
					return;
				}
				if (phase === 'title') {
					if (e.code === 'Enter' || e.code === 'Space') play();
					return;
				}
				if (e.code === 'KeyE' && !activeNpcId) {
					// Quest interactions first, then NPC chat.
					if (g.interact()) {
						keyboard.reset();
						e.preventDefault();
					} else if (nearbyNpcId) {
						e.preventDefault();
						keyboard.reset();
						openDialogue(nearbyNpcId);
					}
				} else if (e.code === 'Escape') {
					activeNpcId = null;
					settingsOpen = false;
				}
				// [ and ] step the clock back / forward an hour.
				else if (e.code === 'BracketRight') world.skipHours(1);
				else if (e.code === 'BracketLeft') world.skipHours(-1);
			};
			window.addEventListener('keydown', onKey);

			const disposeView = attachViewControls(canvas, world.player);
			const disposePicker = createNpcPicker(canvas, world.camera, world.npcObjects, openDialogue);

			const timer = new THREE.Timer();
			timer.connect(document);
			let lastUi = '';
			const loop = (time: number) => {
				timer.update(time);
				const dt = Math.min(timer.getDelta(), 0.1);
				const elapsed = timer.getElapsed();
				g.update(dt, elapsed, keyboard.read());
				g.render(elapsed);

				if (phase === 'playing') {
					const next = g.ui();
					const key = JSON.stringify(next);
					if (key !== lastUi) {
						lastUi = key;
						ui = next;
					}
					const near = g.space === 'out' && g.controllable ? world.nearbyNpc() : null;
					if (near !== nearbyNpcId) nearbyNpcId = near;
				}
				const hour = world.hour();
				const label = formatClock(hour);
				if (label !== clock) {
					clock = label;
					isNight = hour >= 18.9;
				}
			};
			world.setAnimationLoop(loop);
			ready = true;

			cleanup = () => {
				world.setAnimationLoop(null);
				timer.dispose();
				disposePicker();
				disposeView();
				keyboard.dispose();
				window.removeEventListener('resize', resize);
				window.removeEventListener('keydown', onKey);
				g.dispose();
				world.dispose();
			};
		})();

		return () => {
			disposed = true;
			Object.values(timers).forEach((t) => clearTimeout(t));
			music.dispose();
			cleanup();
		};
	});
</script>

<div class="root">
	<canvas bind:this={canvas}></canvas>

	{#if phase === 'title'}
		<TitleScreen {ready} onplay={play} onsettings={() => (settingsOpen = true)} />
	{:else}
		<div class="hint">
			<strong>Namma Planet</strong>
			<span>WASD to walk · Shift to run · drag to look · scroll to zoom</span>
		</div>
		<div class="top-right">
			<div class="clock" class:night={isNight} title="30 real minutes = one day, 8 AM to 8 PM">
				<strong>{clock}</strong>
				<span><kbd>[</kbd> <kbd>]</kbd> change time</span>
			</div>
			<button
				class="gear"
				onclick={() => setMusic(!musicOn)}
				aria-label={musicOn ? 'Mute music' : 'Unmute music'}
				title={musicOn ? 'Mute music' : 'Unmute music'}>{musicOn ? '🔊' : '🔇'}</button
			>
			<button class="gear" onclick={() => (settingsOpen = true)} aria-label="Settings">⚙</button>
		</div>

		{#if ui}
			<QuestHud {ui} {toast} {shout} {showPostIt} {banner} />
			{#if nearbyNpc && !activeNpcId && !ui.prompt}
				<div class="prompt">Press <kbd>E</kbd> or click to talk to {nearbyNpc.name}</div>
			{/if}
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

	{#if terminalOpen && game}
		<Terminal
			onsubmit={(code) => game!.submitCode(code)}
			onclose={() => {
				terminalOpen = false;
				game?.closeTerminal();
			}}
			ondone={() => {
				terminalOpen = false;
				flash(
					'banner',
					() => (banner = 'complete'),
					() => (banner = null),
					4500
				);
			}}
		/>
	{/if}

	{#if settingsOpen}
		<SettingsPanel
			music={musicOn}
			{track}
			onmusic={setMusic}
			ontrack={setTrack}
			onclose={() => (settingsOpen = false)}
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
	.top-right {
		position: absolute;
		top: 1rem;
		right: 1rem;
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}
	.clock {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.2rem;
		padding: 0.6rem 0.9rem;
		border-radius: 0.6rem;
		background: rgb(255 255 255 / 0.75);
		color: #363a3c;
		font-size: 0.8rem;
		transition:
			background 2s,
			color 2s;
	}
	.clock strong {
		font-size: 1.1rem;
		font-variant-numeric: tabular-nums;
	}
	.clock.night {
		background: rgb(20 24 56 / 0.7);
		color: #e8ecff;
	}
	.gear {
		width: 2.6rem;
		height: 2.6rem;
		border: 3px solid #363a3c;
		border-radius: 0.7rem;
		box-shadow: 0 3px 0 #363a3c;
		background: #fffaf0;
		color: #363a3c;
		font-size: 1.3rem;
		cursor: pointer;
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
