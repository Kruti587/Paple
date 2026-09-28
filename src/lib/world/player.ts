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
	pitch = 0.42;
	distance = 5.5;

	private walkPhase = 0;
	private walkAmount = 0;
	private readonly eye = new THREE.Vector3();
	private readonly camUp = new THREE.Vector3();
	private initialised = false;
	private tallColliders: Circle[] | undefined;

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

	waterCenter: THREE.Vector3 | null = null;
	waterRadius = 0;
	inWater = false;

	/** `dynamicColliders` are moving obstacles (vehicles) re-supplied every frame. */
	update(dt: number, input: MoveInput, dynamicColliders: Circle[] = []): void {
		const right = new THREE.Vector3().crossVectors(this.viewForward, this.up).normalize();
		const move = new THREE.Vector3()
			.addScaledVector(this.viewForward, input.z)
			.addScaledVector(right, input.x);
		const moving = move.lengthSq() > 0.01;

		this.inWater = !!(
			this.waterCenter &&
			this.waterRadius > 0 &&
			this.up.distanceTo(this.waterCenter) < this.waterRadius / PLANET_RADIUS
		);

		if (moving) {
			move.normalize();
			const baseSpeed = input.run ? RUN_SPEED : WALK_SPEED;
			const speed = this.inWater ? baseSpeed * 0.72 : baseSpeed;
			const angle = (speed * dt) / PLANET_RADIUS;
			this.up.multiplyScalar(Math.cos(angle)).addScaledVector(move, Math.sin(angle)).normalize();
			this.resolveCollisions(this.colliders);
			// Turn smoothly towards the direction of travel.
			this.facing.lerp(move, 1 - Math.exp(-dt * 12));
		}
		// Vehicles can nudge a standing player too (e.g. one easing back into its lane).
		if (dynamicColliders.length) {
			this.resolveCollisions(dynamicColliders);
			if (moving) this.resolveCollisions(this.colliders);
		}

		// Parallel-transport tangent vectors onto the new tangent plane.
		toTangent(this.facing, this.up);
		toTangent(this.viewForward, this.up);

		this.walkAmount = THREE.MathUtils.lerp(this.walkAmount, moving ? 1 : 0, 1 - Math.exp(-dt * 10));
		this.walkPhase += dt * (input.run ? 14 : 10) * this.walkAmount;
		animateCharacter(this.character, this.walkPhase, this.walkAmount);
		const bob = Math.abs(Math.sin(this.walkPhase)) * 0.06 * this.walkAmount;
		const submergedOffset = this.inWater ? -0.38 : 0;
		placeOnSurface(this.character.group, this.up, this.facing, bob + submergedOffset);
	}

	private resolveCollisions(colliders: Circle[]) {
		for (let pass = 0; pass < 2; pass++) {
			for (const c of colliders) {
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
		this.distance = THREE.MathUtils.clamp(this.distance * (1 + delta), 3, 14);
	}

	/** Where the follow camera wants to be (without smoothing) — used to blend the intro fly-in. */
	followPose(pitch = this.pitch): { eye: THREE.Vector3; target: THREE.Vector3; up: THREE.Vector3 } {
		const target = this.position.clone().addScaledVector(this.up, EYE_HEIGHT);
		const eye = target
			.clone()
			.addScaledVector(this.viewForward, -Math.cos(pitch) * this.distance)
			.addScaledVector(this.up, Math.sin(pitch) * this.distance);
		return { eye, target, up: this.up.clone() };
	}

	/** Snap the smoothed camera to its target next frame (after teleports / cutscenes). */
	resetCamera() {
		this.initialised = false;
	}

	/**
	 * Move instantly to unit direction `to`, facing `facing`. The camera looks along `view`
	 * (defaults to `facing`); `minPitch` raises it, e.g. to clear a tall building behind.
	 */
	teleport(to: THREE.Vector3, facing: THREE.Vector3, view: THREE.Vector3 = facing, minPitch = 0) {
		this.up.copy(to).normalize();
		this.facing.copy(facing);
		toTangent(this.facing, this.up);
		this.viewForward.copy(view);
		toTangent(this.viewForward, this.up);
		this.pitch = Math.max(this.pitch, minPitch);
		placeOnSurface(this.character.group, this.up, this.facing);
		this.resetCamera();
	}

	/**
	 * Pulls `eye` in towards `target` if a building stands between them, so the camera never
	 * ends up inside a house. Samples the sight line against building footprints + heights.
	 */
	/** Fraction (0–1] of the sight line from `target` to `eye` that is clear of buildings. */
	private clearFraction(target: THREE.Vector3, eye: THREE.Vector3, skipNear = 0): number {
		const tall = (this.tallColliders ??= this.colliders.filter((c) => c.height));
		const ray = eye.clone().sub(target);
		const length = ray.length();
		const steps = 14;
		const p = new THREE.Vector3();
		for (let s = 1; s <= steps; s++) {
			const t = s / steps;
			if (t < skipNear) continue;
			p.copy(target).addScaledVector(ray, t);
			const altitude = p.length() - PLANET_RADIUS;
			p.normalize();
			// A widening cone rather than a thin ray: walls that would fill the frame near the
			// camera count as blocking too (e.g. looking down a narrow alley between houses).
			const margin = 0.4 + 0.12 * t * length;
			for (const c of tall) {
				if (altitude > c.height! + 0.6) continue;
				if (p.dot(c.dir) < Math.cos((c.radius + margin) / PLANET_RADIUS)) continue;
				return (s - 1) / steps;
			}
		}
		return 1;
	}

	/**
	 * Keeps buildings out of the way: first tilt the camera up towards top-down (clears the
	 * houses you're pressed against), and only if that fails pull it in closer.
	 */
	private avoidBuildings(): { eye: THREE.Vector3; target: THREE.Vector3; adjusted: boolean } {
		let best: { eye: THREE.Vector3; target: THREE.Vector3; clear: number } | null = null;
		const boosts = [0, 0.25, 0.5, 0.8];
		for (const boost of boosts) {
			const pitch = Math.min(this.pitch + boost, 1.45);
			const pose = this.followPose(pitch);
			// Looking (nearly) straight down, walls right beside the player are parallel to the
			// sight line and don't hide them — only check the upper part of the line.
			const topDown = boost === boosts[boosts.length - 1];
			const clear = this.clearFraction(pose.target, pose.eye, topDown ? 0.4 : 0);
			if (clear >= 1) return { ...pose, adjusted: boost > 0 };
			if (!best || clear > best.clear) best = { ...pose, clear };
		}
		const b = best!;
		return {
			target: b.target,
			eye: b.target.clone().lerp(b.eye, Math.max(0.28, b.clear)),
			adjusted: true
		};
	}

	updateCamera(camera: THREE.PerspectiveCamera, dt: number) {
		const { eye: desired, target, adjusted } = this.avoidBuildings();
		const pulledIn = adjusted || desired.distanceTo(target) < this.eye.distanceTo(target) - 0.05;

		if (!this.initialised) {
			this.eye.copy(desired);
			this.camUp.copy(this.up);
			this.initialised = true;
		}
		// Snap in quickly when something blocks the view, ease back out gently.
		const k = 1 - Math.exp(-dt * (pulledIn ? 18 : 5));
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
