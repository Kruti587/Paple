import * as THREE from 'three';
import { PLANET_RADIUS } from './constants';

const _m = new THREE.Matrix4();
const _x = new THREE.Vector3();
const _z = new THREE.Vector3();

/** Projects `v` onto the tangent plane at unit direction `up` (in place) and normalizes it. */
export function toTangent(v: THREE.Vector3, up: THREE.Vector3): THREE.Vector3 {
	v.addScaledVector(up, -v.dot(up));
	if (v.lengthSq() < 1e-10) v.set(1, 0, 0).addScaledVector(up, -up.x);
	return v.normalize();
}

/** Any tangent vector at `up`, used when no preferred heading exists. */
export function anyTangent(up: THREE.Vector3): THREE.Vector3 {
	const ref = Math.abs(up.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
	return toTangent(ref, up);
}

/**
 * Stands `obj` on the planet at unit direction `up`, facing `forward` (object +Z),
 * lifted `height` metres above the surface.
 */
export function placeOnSurface(
	obj: THREE.Object3D,
	up: THREE.Vector3,
	forward: THREE.Vector3,
	height = 0
): void {
	_z.copy(forward);
	toTangent(_z, up);
	_x.crossVectors(up, _z).normalize();
	_m.makeBasis(_x, up, _z);
	obj.quaternion.setFromRotationMatrix(_m);
	obj.position.copy(up).multiplyScalar(PLANET_RADIUS + height);
}

/** Surface distance in metres between two unit directions. */
export function surfaceDistance(a: THREE.Vector3, b: THREE.Vector3): number {
	return Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1)) * PLANET_RADIUS;
}

/** Moves unit direction `from` by `metres` along tangent `dir` (great-circle step). */
export function stepAlong(from: THREE.Vector3, dir: THREE.Vector3, metres: number): THREE.Vector3 {
	const a = metres / PLANET_RADIUS;
	return from.clone().multiplyScalar(Math.cos(a)).addScaledVector(dir, Math.sin(a)).normalize();
}

/** Deterministic PRNG so the world layout is identical on every load. */
export function mulberry32(seed: number): () => number {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function randomUnitVector(rand: () => number): THREE.Vector3 {
	const z = rand() * 2 - 1;
	const a = rand() * Math.PI * 2;
	const r = Math.sqrt(1 - z * z);
	return new THREE.Vector3(r * Math.cos(a), z, r * Math.sin(a));
}
