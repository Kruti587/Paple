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
	import { playAutoHorn } from '$lib/audio/autoHorn';
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
	let flashActive = $state(false);
	let capturedPostcard = $state<{ dataUrl: string; zone: string; timeStr: string } | null>(null);

	function takePostcardPhoto() {
		if (!canvas) return;
		flashActive = true;
		setTimeout(() => (flashActive = false), 350);
		try {
			const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
			capturedPostcard = {
				dataUrl,
				zone: currentZoneLabel || 'Namma Bengaluru Heart',
				timeStr: clock || 'Bengaluru Daytime'
			};
		} catch (err) {
			console.warn('Postcard snapshot error:', err);
		}
	}
	let ui = $state<GameUi | null>(null);
	let toast = $state<string | null>(null);
	let shout = $state<string | null>(null);
	let showPostIt = $state(false);
	let banner = $state<'caught' | 'complete' | null>(null);
	let terminalOpen = $state(false);
	let currentZoneLabel = $state('');
	let itemPrompt = $state<string | null>(null);
	let tharChatter = $state<string | null>(null);
	let speechBubble = $state<{ name: string; text: string; x: number; y: number } | null>(null);

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
					capturedPostcard = null;
				} else if (e.code === 'KeyP') {
					if (capturedPostcard) {
						capturedPostcard = null;
					} else {
						takePostcardPhoto();
					}
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

					// Auto close NPC conversation if player walks away (>4.5m)
					if (activeNpcId && world.npcDistance && world.npcDistance(activeNpcId) > 4.5) {
						activeNpcId = null;
					}

					// Bangalore Auto-Rickshaw "peep-peep!" horn when approaching
					const autoInfo = world.nearestAuto ? world.nearestAuto() : null;
					if (autoInfo && autoInfo.distance < 9.0 && Math.abs(autoInfo.speed) > 0.8) {
						playAutoHorn(Math.max(0.15, 1.0 - autoInfo.distance / 9.0));
					}

					currentZoneLabel = world.currentZone()?.label ?? '';
					itemPrompt = world.canInteractItem()?.prompt ?? null;
					tharChatter = world.tharChatter();
					speechBubble = g.space === 'out' && world.nearbySpeech ? world.nearbySpeech(world.camera) : null;
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
			<span>WASD to walk · Shift to run · drag to look · P for Polaroid Postcard</span>
		</div>
		<div class="bottom-right">
			<div class="clock" class:night={isNight} title="Current Time in Bengaluru">
				<strong>{clock}</strong>
			</div>
			<button
				class="gear"
				onclick={takePostcardPhoto}
				aria-label="Polaroid Camera"
				title="Capture Bangalore Postcard (P)"
			>
				📷
			</button>
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

		{#if speechBubble && !activeNpcId}
			<div
				class="comic-speech-bubble"
				style="left: {speechBubble.x}%; top: {speechBubble.y}%;"
			>
				<div class="speech-speaker">{speechBubble.name}</div>
				<div class="speech-text">{speechBubble.text}</div>
				<div class="speech-tail"></div>
			</div>
		{/if}
	{/if}

	{#if flashActive}
		<div class="camera-flash"></div>
	{/if}

	{#if capturedPostcard}
		<div class="polaroid-overlay" role="dialog" aria-modal="true">
			<div class="polaroid-card">
				<div class="polaroid-photo-frame">
					<img src={capturedPostcard.dataUrl} alt="Bangalore Snapshot" class="polaroid-img" />
					<div class="polaroid-stamp">NAMMA BENGALURU</div>
				</div>
				<div class="polaroid-caption">
					<div class="polaroid-location">📍 {capturedPostcard.zone}</div>
					<div class="polaroid-date">Captured at {capturedPostcard.timeStr}</div>
				</div>
				<div class="polaroid-actions">
					<a
						href={capturedPostcard.dataUrl}
						download={`Bangalore_Postcard_${Date.now()}.jpg`}
						class="polaroid-btn save"
					>
						💾 Save Postcard
					</a>
					<button class="polaroid-btn close" onclick={() => (capturedPostcard = null)}>
						Close [P]
					</button>
				</div>
			</div>
		</div>
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
	.comic-speech-bubble {
		position: absolute;
		transform: translate(-50%, -100%) translateY(-22px);
		background: #ffffff;
		border: 2.5px solid #23272a;
		border-radius: 16px;
		padding: 0.6rem 0.95rem;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0, 0, 0, 0.12);
		max-width: 240px;
		text-align: center;
		pointer-events: none;
		z-index: 55;
		animation: speechPop 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}
	@keyframes speechPop {
		from {
			opacity: 0;
			transform: translate(-50%, -85%) translateY(-22px) scale(0.85);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -100%) translateY(-22px) scale(1);
		}
	}
	.speech-speaker {
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #e11d48;
		margin-bottom: 0.2rem;
	}
	.speech-text {
		font-size: 0.90rem;
		font-weight: 700;
		line-height: 1.35;
		color: #1e293b;
	}
	.speech-tail {
		position: absolute;
		bottom: -11px;
		left: 50%;
		transform: translateX(-50%);
		width: 0;
		height: 0;
		border-left: 9px solid transparent;
		border-right: 9px solid transparent;
		border-top: 11px solid #23272a;
	}
	.speech-tail::after {
		content: '';
		position: absolute;
		bottom: 2.5px;
		left: -7px;
		width: 0;
		height: 0;
		border-left: 7px solid transparent;
		border-right: 7px solid transparent;
		border-top: 9px solid #ffffff;
	}

	/* ── Camera Flash & Polaroid Snapshot ── */
	.camera-flash {
		position: fixed;
		inset: 0;
		background: #ffffff;
		z-index: 9999;
		pointer-events: none;
		animation: flashFade 0.35s ease-out forwards;
	}
	@keyframes flashFade {
		0% { opacity: 0.95; }
		100% { opacity: 0; }
	}

	.polaroid-overlay {
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.75);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
		animation: fadeIn 0.25s ease-out;
	}
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.polaroid-card {
		background: #fdfbf7;
		padding: 1.25rem 1.25rem 1.75rem;
		border-radius: 4px;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0,0,0,0.08);
		max-width: 440px;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		transform: rotate(-1.5deg);
		transition: transform 0.2s ease;
	}
	.polaroid-card:hover {
		transform: rotate(0deg) scale(1.01);
	}
	.polaroid-photo-frame {
		position: relative;
		background: #0f172a;
		border-radius: 2px;
		overflow: hidden;
		aspect-ratio: 4 / 3;
		box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.5);
	}
	.polaroid-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.polaroid-stamp {
		position: absolute;
		top: 10px;
		right: 10px;
		background: rgba(225, 29, 72, 0.9);
		color: #ffffff;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		padding: 0.25rem 0.55rem;
		border-radius: 4px;
		border: 1px dashed rgba(255, 255, 255, 0.7);
		box-shadow: 0 2px 6px rgba(0,0,0,0.3);
	}
	.polaroid-caption {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		border-top: 1px dashed #cbd5e1;
		padding-top: 0.75rem;
	}
	.polaroid-location {
		font-family: 'Courier New', Courier, monospace;
		font-size: 1.05rem;
		font-weight: 800;
		color: #0f172a;
	}
	.polaroid-date {
		font-size: 0.78rem;
		color: #64748b;
		font-weight: 600;
	}
	.polaroid-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.4rem;
	}
	.polaroid-btn {
		flex: 1;
		padding: 0.65rem 1rem;
		border-radius: 8px;
		font-weight: 700;
		font-size: 0.88rem;
		cursor: pointer;
		text-align: center;
		text-decoration: none;
		transition: all 0.15s ease;
		border: none;
	}
	.polaroid-btn.save {
		background: #b91c1c;
		color: #ffffff;
	}
	.polaroid-btn.save:hover {
		background: #991b1b;
		transform: translateY(-1px);
	}
	.polaroid-btn.close {
		background: #e2e8f0;
		color: #1e293b;
	}
	.polaroid-btn.close:hover {
		background: #cbd5e1;
	}
</style>
