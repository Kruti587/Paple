import * as THREE from 'three';
import { PLANET_RADIUS } from './constants';
import { animateCharacter, type Character } from './characters';
import type { MoveInput } from './input';
import type { Circle } from './layout';
import { placeOnSurface, toTangent } from './sphere';

const WALK_SPEED = 3.2;
const RUN_SPEED = 6;
const PLAYER_RADIUS = 0.3;
const EYE_HEIGHT = 1.1;

/**
 * Walks a character over the sphere. Position is a unit direction; "forward" for input is the
 * camera's heading, parallel-transported as the player moves so W always means "away from camera".
 */
export class PlayerController {
	readonly up: THREE.Vector3;
	readonly facing: THREE.Vector3;
	readonly viewForward: THREE.Vector3;
	pitch = 0.78;
	distance = 10;

	private walkPhase = 0;
	private walkAmount = 0;
	private readonly eye = new THREE.Vector3();
	private readonly camUp = new THREE.Vector3();
	private initialised = false;

	constructor(
		readonly character: Character,
		start: THREE.Vector3,
		heading: THREE.Vector3,
		private readonly colliders: Circle[]
	) {
		this.up = start.clone().normalize();
		this.facing = toTangent(heading.clone(), this.up);
		this.viewForward = this.facing.clone();
		placeOnSurface(character.group, this.up, this.facing);
	}

	get position(): THREE.Vector3 {
		return this.character.group.position;
	}

	update(dt: number, input: MoveInput): void {
		const right = new THREE.Vector3().crossVectors(this.viewForward, this.up).normalize();
		const move = new THREE.Vector3()
			.addScaledVector(this.viewForward, input.z)
			.addScaledVector(right, input.x);
		const moving = move.lengthSq() > 0.01;

		if (moving) {
			move.normalize();
			const angle = ((input.run ? RUN_SPEED : WALK_SPEED) * dt) / PLANET_RADIUS;
			this.up.multiplyScalar(Math.cos(angle)).addScaledVector(move, Math.sin(angle)).normalize();
			this.resolveCollisions();
			// Turn smoothly towards the direction of travel.
			this.facing.lerp(move, 1 - Math.exp(-dt * 12));
		}

		// Parallel-transport tangent vectors onto the new tangent plane.
		toTangent(this.facing, this.up);
		toTangent(this.viewForward, this.up);

		this.walkAmount = THREE.MathUtils.lerp(this.walkAmount, moving ? 1 : 0, 1 - Math.exp(-dt * 10));
		this.walkPhase += dt * (input.run ? 14 : 10) * this.walkAmount;
		animateCharacter(this.character, this.walkPhase, this.walkAmount);
		const bob = Math.abs(Math.sin(this.walkPhase)) * 0.06 * this.walkAmount;
		placeOnSurface(this.character.group, this.up, this.facing, bob);
	}

	private resolveCollisions() {
		for (let pass = 0; pass < 2; pass++) {
			for (const c of this.colliders) {
				const min = (c.radius + PLAYER_RADIUS) / PLANET_RADIUS;
				const cos = this.up.dot(c.dir);
				if (cos <= Math.cos(min)) continue;
				// Push out along the great circle away from the obstacle centre.
				const away = toTangent(this.up.clone(), c.dir);
				this.up
					.copy(c.dir)
					.multiplyScalar(Math.cos(min))
					.addScaledVector(away, Math.sin(min))
					.normalize();
			}
		}
	}

	/** Orbit the view around the player (mouse drag). */
	rotateView(dx: number, dy: number) {
		this.viewForward.applyAxisAngle(this.up, -dx);
		this.pitch = THREE.MathUtils.clamp(this.pitch + dy, 0.2, 1.3);
	}

	zoom(delta: number) {
		this.distance = THREE.MathUtils.clamp(this.distance * (1 + delta), 5, 30);
	}

	updateCamera(camera: THREE.PerspectiveCamera, dt: number) {
		const target = this.position.clone().addScaledVector(this.up, EYE_HEIGHT);
		const desired = target
			.clone()
			.addScaledVector(this.viewForward, -Math.cos(this.pitch) * this.distance)
			.addScaledVector(this.up, Math.sin(this.pitch) * this.distance);

		if (!this.initialised) {
			this.eye.copy(desired);
			this.camUp.copy(this.up);
			this.initialised = true;
		}
		const k = 1 - Math.exp(-dt * 8);
		this.eye.lerp(desired, k);
		this.camUp.lerp(this.up, k).normalize();
		camera.position.copy(this.eye);
		camera.up.copy(this.camUp);
		camera.lookAt(target);
	}
}

/** Mouse-drag orbit and wheel zoom. Drags are what the NPC picker ignores, so both coexist. */
export function attachViewControls(
	canvas: HTMLCanvasElement,
	player: PlayerController
): () => void {
	let dragging = false;
	let lastX = 0;
	let lastY = 0;
	const onDown = (e: PointerEvent) => {
		dragging = true;
		lastX = e.clientX;
		lastY = e.clientY;
	};
	const onMove = (e: PointerEvent) => {
		if (!dragging) return;
		player.rotateView((e.clientX - lastX) * 0.006, (e.clientY - lastY) * 0.004);
		lastX = e.clientX;
		lastY = e.clientY;
	};
	const onUp = () => (dragging = false);
	const onWheel = (e: WheelEvent) => {
		e.preventDefault();
		player.zoom(Math.sign(e.deltaY) * 0.1);
	};
	canvas.addEventListener('pointerdown', onDown);
	window.addEventListener('pointermove', onMove);
	window.addEventListener('pointerup', onUp);
	canvas.addEventListener('wheel', onWheel, { passive: false });
	return () => {
		canvas.removeEventListener('pointerdown', onDown);
		window.removeEventListener('pointermove', onMove);
		window.removeEventListener('pointerup', onUp);
		canvas.removeEventListener('wheel', onWheel);
	};
}
