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
	import TaskList from '$lib/components/TaskList.svelte';
	import ZoneBanner from '$lib/components/ZoneBanner.svelte';
	import { quests } from '$lib/game/questManager';
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
	let currentZoneLabel = $state('');
	let itemPrompt = $state<string | null>(null);
	let tharChatter = $state<string | null>(null);

	// --- NPC dialogue ---
	let activeNpcId = $state<string | null>(null);
	let nearbyNpcId = $state<string | null>(null);
	const activeNpc = $derived(activeNpcId ? npcConfig[activeNpcId] : undefined);
	const nearbyNpc = $derived(nearbyNpcId ? npcConfig[nearbyNpcId] : undefined);

	const openDialogue = (npcId: string) => {
		// NPC chats only outdoors, and not mid-chase.
		if (!game?.controllable || game.space !== 'out' || ui?.chasing) return;
		if (npcId in npcConfig) {
			activeNpcId = npcId;
			// Activate and progress quest for this character
			const questMap: Record<string, string> = {
				musician: 'musician_veena',
				chef: 'chef_chai_rush',
				alien: 'alien_ufo_repair',
				diver: 'mani_lake_revival',
				caveman: 'grog_ancient_spark'
			};
			if (npcId in questMap) {
				quests.activateQuest(questMap[npcId]);
				if (npcId === 'musician') {
					quests.completeTask('musician_veena', 'talk_musician');
					if (quests.hasCompletedTask('musician_veena', 'get_veena')) {
						quests.completeTask('musician_veena', 'deliver_veena');
					}
				} else if (npcId === 'chef') {
					quests.completeTask('chef_chai_rush', 'talk_chef');
				} else if (npcId === 'alien') {
					quests.completeTask('alien_ufo_repair', 'inspect_ufo');
				} else if (npcId === 'diver') {
					quests.completeTask('mani_lake_revival', 'talk_mani');
				} else if (npcId === 'caveman') {
					quests.completeTask('grog_ancient_spark', 'talk_grog');
				}
			}
		}
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
					const interactable = world.canInteractItem();
					if (interactable) {
						world.interactItem();
						keyboard.reset();
						e.preventDefault();
						return;
					}
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
					currentZoneLabel = world.currentZone()?.label ?? '';
					itemPrompt = world.canInteractItem()?.prompt ?? null;
					tharChatter = world.tharChatter();
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
		<div class="bottom-right">
			<div class="clock" class:night={isNight} title="Current Time in Bengaluru">
				<strong>{clock}</strong>
			</div>
			<button
				class="gear"
				onclick={() => setMusic(!musicOn)}
				aria-label={musicOn ? 'Mute music' : 'Unmute music'}
				title={musicOn ? 'Mute music' : 'Unmute music'}>{musicOn ? '🔊' : '🔇'}</button
			>
			<button class="gear" onclick={() => (settingsOpen = true)} aria-label="Settings" title="Settings">⚙</button>
		</div>

		{#if ui}
			<QuestHud {ui} {toast} {shout} {showPostIt} {banner} />
			{#if itemPrompt && !activeNpcId}
				<div class="prompt">{itemPrompt}</div>
			{:else if nearbyNpc && !activeNpcId && !ui.prompt}
				<div class="prompt">Press <kbd>E</kbd> or click to talk to {nearbyNpc.name}</div>
			{/if}
		{/if}

		<ZoneBanner zoneLabel={currentZoneLabel} />
		<TaskList />

		{#if tharChatter}
			<div class="thar-bubble">{tharChatter}</div>
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
	.bottom-right {
		position: absolute;
		bottom: 1.25rem;
		right: 1.25rem;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		z-index: 40;
	}
	.clock {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.55rem 0.95rem;
		border-radius: 0.75rem;
		background: rgba(255, 255, 255, 0.88);
		border: 2px solid #363a3c;
		box-shadow: 0 3px 0 #363a3c;
		color: #1e293b;
		font-size: 0.95rem;
		transition: background 1s, color 1s;
	}
	.clock strong {
		font-size: 1.05rem;
		font-variant-numeric: tabular-nums;
		font-weight: 700;
	}
	.clock.night {
		background: rgba(20, 24, 56, 0.85);
		color: #e8ecff;
		border-color: rgba(255, 255, 255, 0.4);
		box-shadow: 0 3px 0 rgba(0, 0, 0, 0.4);
	}
	.gear {
		width: 2.6rem;
		height: 2.6rem;
		border: 2px solid #363a3c;
		border-radius: 0.75rem;
		box-shadow: 0 3px 0 #363a3c;
		background: #fffaf0;
		color: #363a3c;
		font-size: 1.25rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.1s, background 0.15s;
	}
	.gear:hover {
		background: #ffffff;
		transform: translateY(-2px);
	}
	.prompt {
		position: absolute;
		left: 50%;
		bottom: 4.8rem;
		transform: translateX(-50%);
		padding: 0.6rem 1.2rem;
		border-radius: 999px;
		background: rgb(54 58 60 / 0.85);
		color: white;
	}
	.thar-bubble {
		position: absolute;
		left: 50%;
		top: 4.8rem;
		transform: translateX(-50%);
		padding: 0.65rem 1.25rem;
		background: #fff7ed;
		border: 2px solid #ea580c;
		border-radius: 999px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
		color: #9a3412;
		font-weight: 700;
		font-size: 0.95rem;
		pointer-events: none;
		z-index: 55;
	}
	kbd {
		padding: 0 0.35rem;
		border-radius: 0.25rem;
		background: white;
		color: #363a3c;
		font-family: inherit;
	}
</style>
