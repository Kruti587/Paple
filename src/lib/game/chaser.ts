import * as THREE from 'three';
import { stepAlong, surfaceDistance, toTangent } from '$lib/world/sphere';

/** A spot either inside the building (flat floor plate) or out on the planet (unit direction). */
export type Place =
	{ space: 'in'; floor: number; x: number; z: number } | { space: 'out'; dir: THREE.Vector3 };

const sameArea = (a: Place, b: Place) =>
	a.space === b.space && (a.space === 'out' || a.floor === (b as { floor: number }).floor);

/** Metres between two places, or Infinity if they're on different floors / inside vs outside. */
export function placeDistance(a: Place, b: Place): number {
	if (!sameArea(a, b)) return Infinity;
	if (a.space === 'out') return surfaceDistance(a.dir, (b as { dir: THREE.Vector3 }).dir);
	const bb = b as { x: number; z: number };
	return Math.hypot(a.x - bb.x, a.z - bb.z);
}

const clonePlace = (p: Place): Place =>
	p.space === 'out' ? { space: 'out', dir: p.dir.clone() } : { ...p };

/**
 * Follows the player's breadcrumb trail. Since the trail is wherever the player actually walked,
 * the chaser threads through doors, up and down stairwells and out onto the planet without any
 * pathfinding — and never walks through walls.
 */
export class Chaser {
	active = false;
	pos: Place = { space: 'in', floor: 0, x: 0, z: 0 };
	/** Interior heading (radians around +Y) and outdoor facing (tangent), for rendering. */
	heading = 0;
	readonly facing = new THREE.Vector3(1, 0, 0);
	moving = false;
	phase = 0;

	private trail: Place[] = [];
	private wait = 0;

	constructor(private readonly speed = 3.3) {}

	start(from: Place, headStart: number) {
		this.active = true;
		this.pos = clonePlace(from);
		this.trail = [];
		this.wait = headStart;
	}

	stop() {
		this.active = false;
		this.moving = false;
		this.trail = [];
	}

	/** Drop a breadcrumb where the player is (only when they've moved or changed area). */
	record(p: Place) {
		if (!this.active) return;
		const last = this.trail[this.trail.length - 1];
		if (last && placeDistance(last, p) < 0.3) return;
		this.trail.push(clonePlace(p));
	}

	update(dt: number) {
		this.moving = false;
		if (!this.active) return;
		if (this.wait > 0) {
			this.wait -= dt;
			return;
		}
		let budget = this.speed * dt;
		while (budget > 0 && this.trail.length) {
			const target = this.trail[0];
			if (!sameArea(this.pos, target)) {
				// The player took the stairs / a door here: follow them through.
				this.pos = clonePlace(target);
				this.trail.shift();
				continue;
			}
			const d = placeDistance(this.pos, target);
			if (d <= budget) {
				this.face(target);
				this.pos = clonePlace(target);
				this.trail.shift();
				budget -= d;
			} else {
				this.face(target);
				this.advance(target, budget, d);
				budget = 0;
			}
			this.moving = true;
		}
		if (this.moving) this.phase += dt * 13;
	}

	private face(target: Place) {
		if (this.pos.space === 'in' && target.space === 'in') {
			const dx = target.x - this.pos.x;
			const dz = target.z - this.pos.z;
			if (dx * dx + dz * dz > 1e-6) this.heading = Math.atan2(dx, dz);
		} else if (this.pos.space === 'out' && target.space === 'out') {
			const t = target.dir.clone().sub(this.pos.dir);
			if (t.lengthSq() > 1e-12) this.facing.copy(toTangent(t, this.pos.dir));
		}
	}

	private advance(target: Place, metres: number, total: number) {
		if (this.pos.space === 'in' && target.space === 'in') {
			const k = metres / total;
			this.pos.x += (target.x - this.pos.x) * k;
			this.pos.z += (target.z - this.pos.z) * k;
		} else if (this.pos.space === 'out' && target.space === 'out') {
			this.pos.dir.copy(stepAlong(this.pos.dir, this.facing, metres));
		}
	}
}
