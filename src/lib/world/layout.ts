import * as THREE from 'three';
import { ROAD_HALF_WIDTH } from './constants';
import { distanceToRoads, type Road } from './roads';
import { anyTangent, randomUnitVector, stepAlong, surfaceDistance } from './sphere';

export interface Circle {
	dir: THREE.Vector3;
	radius: number;
	/** Height (m) of what stands here — buildings set it so the camera can avoid them. */
	height?: number;
}

/**
 * Keeps track of occupied ground so props don't overlap roads or each other,
 * and collects the solid circles the player collides with.
 */
export class Layout {
	/** Everything placed (used for spacing). */
	readonly reserved: Circle[] = [];
	/** Subset the player can't walk through. */
	readonly colliders: Circle[] = [];

	constructor(
		readonly roads: Road[],
		readonly rand: () => number
	) {}

	isFree(dir: THREE.Vector3, radius: number, roadClearance = 0.3): boolean {
		if (distanceToRoads(this.roads, dir) < ROAD_HALF_WIDTH + roadClearance + radius) return false;
		return this.reserved.every((c) => surfaceDistance(c.dir, dir) >= c.radius + radius);
	}

	reserve(dir: THREE.Vector3, radius: number, solid = true, colliderRadius = radius): void {
		this.reserved.push({ dir: dir.clone(), radius });
		if (solid) this.colliders.push({ dir: dir.clone(), radius: colliderRadius });
	}

	/** Approximates a rectangle with a row of circles along its longer axis. */
	private boxCircles(
		up: THREE.Vector3,
		forward: THREE.Vector3,
		width: number,
		depth: number
	): Circle[] {
		const right = new THREE.Vector3().crossVectors(up, forward).normalize();
		const axis = width >= depth ? right : forward;
		const along = Math.max(width, depth);
		const r = Math.min(width, depth) / 2;
		const n = Math.max(1, Math.ceil((along - 2 * r) / r) + 1);
		const circles: Circle[] = [];
		for (let i = 0; i < n; i++) {
			const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * (along - 2 * r);
			circles.push({ dir: stepAlong(up, axis, t), radius: r });
		}
		return circles;
	}

	boxIsFree(
		up: THREE.Vector3,
		forward: THREE.Vector3,
		width: number,
		depth: number,
		roadClearance = 0.3
	): boolean {
		return this.boxCircles(up, forward, width, depth).every((c) =>
			this.isFree(c.dir, c.radius, roadClearance)
		);
	}

	reserveBox(
		up: THREE.Vector3,
		forward: THREE.Vector3,
		width: number,
		depth: number,
		height?: number
	): void {
		// Add 0.65m spacing buffer around reserved footprint so no two buildings ever touch or clip
		for (const c of this.boxCircles(up, forward, width, depth)) {
			this.reserve(c.dir, c.radius + 0.65, true, c.radius * 1.02);
			if (height) this.colliders[this.colliders.length - 1].height = height;
		}
	}

	reserveWalkthrough(
		up: THREE.Vector3,
		forward: THREE.Vector3,
		width: number,
		depth: number
	): void {
		// 1. Reserve the full footprint as non-solid (solid = false)
		// so NO other buildings, back-row houses, or trees ever spawn inside the temple!
		for (const c of this.boxCircles(up, forward, width, depth)) {
			this.reserve(c.dir, c.radius * 1.05, false);
		}
		// 2. Add solid colliders ONLY along the perimeter walls, leaving a 2.4m central aisle open
		const right = new THREE.Vector3().crossVectors(up, forward).normalize();
		const wallOffset = width * 0.38;
		const wallRadius = width * 0.16;
		this.reserve(stepAlong(up, right, -wallOffset), wallRadius, true);
		this.reserve(stepAlong(stepAlong(up, right, -wallOffset), forward, -depth * 0.28), wallRadius, true);
		this.reserve(stepAlong(up, right, wallOffset), wallRadius, true);
		this.reserve(stepAlong(stepAlong(up, right, wallOffset), forward, -depth * 0.28), wallRadius, true);
		this.reserve(stepAlong(up, forward, -depth * 0.44), width * 0.30, true);
	}

	/** Searches outward from `preferred` for a free spot. */
	findSpot(
		preferred: THREE.Vector3,
		radius: number,
		roadClearance = 0.3,
		tries = 600
	): THREE.Vector3 | null {
		if (this.isFree(preferred, radius, roadClearance)) return preferred.clone();
		for (let i = 0; i < tries; i++) {
			const spread = 0.5 + (i / tries) * 30;
			const t = anyTangent(preferred).applyAxisAngle(preferred, this.rand() * Math.PI * 2);
			const c = stepAlong(preferred, t, this.rand() * spread);
			if (this.isFree(c, radius, roadClearance)) return c;
		}
		return null;
	}

	randomFreeSpot(radius: number, roadClearance = 0.3, tries = 200): THREE.Vector3 | null {
		for (let i = 0; i < tries; i++) {
			const c = randomUnitVector(this.rand);
			if (this.isFree(c, radius, roadClearance)) return c;
		}
		return null;
	}
}
