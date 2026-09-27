import * as THREE from 'three';
import { animateCharacter, createStaffer } from '$lib/world/characters';
import type { World } from '$lib/world/createWorld';
import type { MoveInput } from '$lib/world/input';
import { COMPANY_NAME } from '$lib/world/props/signs';
import { placeOnSurface, surfaceDistance } from '$lib/world/sphere';
import { Chaser, placeDistance, type Place } from './chaser';
import { FLOOR_NAMES, Interior, STAFFER_SEAT, TOP_FLOOR, type Zone } from './interior';

export type Stage = 'toBuilding' | 'stealPostIt' | 'escape' | 'terminal' | 'complete';

export type GameEvent =
	| { type: 'toast'; text: string }
	| { type: 'postIt'; code: string }
	| { type: 'shout'; text: string }
	| { type: 'caught' }
	| { type: 'terminal' }
	| { type: 'complete' };

export interface GameUi {
	stage: Stage;
	objective: string;
	hint: string | null;
	/** Metres to the current objective (outdoors only). */
	distance: number | null;
	space: 'in' | 'out';
	floor: string | null;
	hasPostIt: boolean;
	code: string;
	chasing: boolean;
	prompt: string | null;
}

const DOOR_RADIUS = 0.75;
const KIOSK_RADIUS = 1.7;
const CATCH_RADIUS = 0.55;
const FADE_SECONDS = 0.35;

/** Quest director for "The Post-it Heist", tying the planet world and the HQ interior together. */
export class Game {
	readonly interior: Interior;
	readonly code: string;
	stage: Stage = 'toBuilding';
	space: 'in' | 'out' = 'out';
	started = false;
	terminalOpen = false;

	private readonly chaser = new Chaser();
	private readonly outdoorChaser = createStaffer();
	private terminalArmed = true;
	private lastZone: Zone = null;
	private fade = 0;
	private fadeDir: 0 | 1 | -1 = 0;
	private onFaded: (() => void) | null = null;

	constructor(
		private readonly world: World,
		private readonly emit: (e: GameEvent) => void
	) {
		this.code = String(1000 + Math.floor(Math.random() * 9000));
		this.interior = new Interior(this.code);
		this.interior.setPostItOnFridge(true);
		this.outdoorChaser.group.traverse((o) => (o.castShadow = true));
		this.outdoorChaser.group.visible = false;
		world.scene.add(this.outdoorChaser.group);
	}

	/** Title → play: spin the world down to the player and point them at the building. */
	start() {
		this.started = true;
		this.world.setCameraMode('intro', 3.4);
		this.world.setMarker(this.world.quest.door);
	}

	/** Can the player move right now? */
	get controllable() {
		return (
			this.started &&
			this.world.cameraMode() === 'follow' &&
			this.fadeDir === 0 &&
			!this.terminalOpen
		);
	}

	update(dt: number, elapsed: number, input: MoveInput) {
		const active = this.controllable;
		this.world.update(dt, elapsed, input, { playerActive: active && this.space === 'out' });
		if (this.space === 'in') this.interior.update(dt, input, active, elapsed);
		this.updateFade(dt);
		if (!active) {
			this.renderChaser();
			return;
		}

		if (this.space === 'out') this.updateOutside();
		else this.updateInside();

		// Chase
		if (this.chaser.active && !this.terminalOpen) {
			this.chaser.record(this.playerPlace());
			this.chaser.update(dt);
			if (placeDistance(this.chaser.pos, this.playerPlace()) < CATCH_RADIUS) this.caught();
		}
		this.renderChaser();
	}

	render(elapsed: number) {
		const outline = this.world.outline;
		outline.fade = this.fade;
		if (this.space === 'in') {
			outline.setIndoor(new THREE.Vector3(0, 1, 0));
			outline.render(elapsed, this.interior.scene, this.interior.camera);
		} else {
			outline.render(elapsed);
		}
	}

	resize(width: number, height: number) {
		this.world.resize(width, height);
		this.interior.resize(width, height);
	}

	/** E key. Returns true if the game used it (so it doesn't also open NPC chat). */
	interact(): boolean {
		if (!this.controllable) return false;
		if (this.space === 'in' && this.interior.zone() === 'fridge' && this.stage === 'stealPostIt') {
			this.grabPostIt();
			return true;
		}
		return false;
	}

	submitCode(input: string): boolean {
		if (input.replace(/\s+/g, '') !== this.code) return false;
		this.stage = 'complete';
		this.terminalOpen = false;
		this.chaser.stop();
		this.world.setMarker(null);
		this.emit({ type: 'complete' });
		return true;
	}

	/** Closing the prompt without the right code: the chase resumes; walk away to re-arm it. */
	closeTerminal() {
		this.terminalOpen = false;
		this.terminalArmed = false;
	}

	ui(): GameUi {
		const inside = this.space === 'in';
		const floorName = inside ? FLOOR_NAMES[this.interior.floor] : null;
		let objective = '';
		let hint: string | null = null;
		let target: THREE.Vector3 | null = null;
		switch (this.stage) {
			case 'toBuilding':
				objective = `Head to the ${COMPANY_NAME} building`;
				target = this.world.quest.door;
				break;
			case 'stealPostIt':
				if (!inside) {
					objective = `Go inside the ${COMPANY_NAME} building`;
					target = this.world.quest.door;
				} else if (this.interior.floor < TOP_FLOOR) {
					objective = 'Get to the 3rd-floor pantry';
					hint = 'The elevator is broken — take the stairs';
				} else objective = 'Steal the post-it off the fridge';
				break;
			case 'escape':
				objective = inside ? 'RUN! Get out of the building!' : 'Get to the terminal!';
				hint = 'Hold Shift to sprint';
				if (!inside) target = this.world.quest.kiosk;
				break;
			case 'terminal':
				objective = 'Enter the code at the terminal outside';
				hint = this.chaser.active ? 'Hold Shift to sprint' : null;
				target = this.world.quest.kiosk;
				break;
			case 'complete':
				objective = 'Quest complete — explore Namma Planet';
				break;
		}
		return {
			stage: this.stage,
			objective,
			hint,
			distance:
				!inside && target ? Math.round(surfaceDistance(this.world.player.up, target)) : null,
			space: this.space,
			floor: floorName,
			hasPostIt: this.stage === 'escape' || this.stage === 'terminal' || this.stage === 'complete',
			code: this.code,
			chasing: this.chaser.active,
			prompt:
				inside && this.interior.zone() === 'fridge' && this.stage === 'stealPostIt'
					? 'Press E to steal the post-it'
					: null
		};
	}

	dispose() {
		this.interior.dispose();
	}

	// --- Internals ----------------------------------------------------------------------------

	private playerPlace(): Place {
		return this.space === 'out'
			? { space: 'out', dir: this.world.player.up }
			: { space: 'in', floor: this.interior.floor, x: this.interior.pos.x, z: this.interior.pos.y };
	}

	private updateOutside() {
		const q = this.world.quest;
		const up = this.world.player.up;
		if (surfaceDistance(up, q.door) < DOOR_RADIUS) {
			if (this.stage === 'toBuilding') this.stage = 'stealPostIt';
			this.transition(() => {
				this.space = 'in';
				this.interior.enter(0, 'entrance');
				this.chaser.record(this.playerPlace());
			});
			return;
		}
		const kioskDist = surfaceDistance(up, q.kiosk);
		if (!this.terminalArmed && kioskDist > KIOSK_RADIUS + 1) this.terminalArmed = true;
		if (this.stage === 'terminal' && this.terminalArmed && kioskDist < KIOSK_RADIUS) {
			this.terminalOpen = true;
			this.emit({ type: 'terminal' });
		}
	}

	private updateInside() {
		const zone = this.interior.zone();
		const entered = zone !== this.lastZone;
		this.lastZone = zone;
		if (zone === 'elevator' && entered)
			this.emit({ type: 'toast', text: 'The elevator is broken. Take the stairs!' });
		if (zone === 'stairsUp' || zone === 'stairsDown') {
			const next = this.interior.floor + (zone === 'stairsUp' ? 1 : -1);
			this.chaser.record(this.playerPlace());
			this.transition(() => {
				this.interior.enter(next, 'landing');
				this.chaser.record(this.playerPlace());
			});
		} else if (zone === 'exit') {
			this.chaser.record(this.playerPlace());
			this.transition(() => {
				this.space = 'out';
				this.lastZone = null;
				this.placeOutside();
				if (this.stage === 'escape') {
					this.stage = 'terminal';
					this.world.setMarker(this.world.quest.kiosk);
				}
				this.chaser.record(this.playerPlace());
			});
		}
	}

	private grabPostIt() {
		this.stage = 'escape';
		this.interior.setPostItOnFridge(false);
		this.chaser.start({ space: 'in', floor: TOP_FLOOR, x: STAFFER_SEAT.x, z: STAFFER_SEAT.y }, 2.2);
		this.emit({ type: 'postIt', code: this.code });
		this.emit({ type: 'shout', text: 'HEY! That’s MY post-it!!' });
	}

	/** Out of the front door: Anakin faces away, the camera looks back at the HQ from the road. */
	private placeOutside() {
		const q = this.world.quest;
		this.world.player.teleport(q.outside, q.outward, q.outward.clone().negate(), 1.0);
	}

	private caught() {
		this.chaser.stop();
		this.emit({ type: 'caught' });
		this.transition(() => {
			this.stage = 'stealPostIt';
			this.space = 'out';
			this.terminalOpen = false;
			this.interior.setPostItOnFridge(true);
			this.placeOutside();
			this.world.setMarker(this.world.quest.door);
		});
	}

	private transition(atMidpoint: () => void) {
		if (this.fadeDir !== 0) return;
		this.fadeDir = 1;
		this.onFaded = atMidpoint;
	}

	private updateFade(dt: number) {
		if (this.fadeDir === 0) return;
		this.fade = THREE.MathUtils.clamp(this.fade + (this.fadeDir * dt) / FADE_SECONDS, 0, 1);
		if (this.fadeDir === 1 && this.fade >= 1) {
			this.onFaded?.();
			this.onFaded = null;
			this.fadeDir = -1;
		} else if (this.fadeDir === -1 && this.fade <= 0) this.fadeDir = 0;
	}

	private renderChaser() {
		const c = this.chaser;
		const visible = c.active || this.stage === 'complete';
		const p = c.pos;
		// Indoors: only if on the player's floor.
		this.interior.setChaser(
			visible && this.space === 'in' && p.space === 'in' && p.floor === this.interior.floor
				? { x: p.x, z: p.z, heading: c.heading, moving: c.moving, phase: c.phase }
				: null
		);
		// Outdoors
		const outVisible = visible && p.space === 'out';
		this.outdoorChaser.group.visible = outVisible;
		if (outVisible) {
			placeOnSurface(this.outdoorChaser.group, p.dir, c.facing);
			animateCharacter(this.outdoorChaser, c.phase, c.moving ? 1 : 0);
		}
	}
}
