import * as THREE from 'three';
import { FOOTPATH_WIDTH, PALETTE, PLANET_RADIUS, ROAD_HALF_WIDTH } from './constants';
import { vertexColorToon } from './materials';
import type { Road } from './roads';

export interface GroundPatch {
	dir: THREE.Vector3;
	radius: number;
	color: THREE.ColorRepresentation;
}

// Cheap 3D value noise — enough for painterly colour variation.
function hash(x: number, y: number, z: number) {
	const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
	return h - Math.floor(h);
}
function valueNoise(x: number, y: number, z: number) {
	const xi = Math.floor(x),
		yi = Math.floor(y),
		zi = Math.floor(z);
	const s = (t: number) => t * t * (3 - 2 * t);
	const xf = s(x - xi),
		yf = s(y - yi),
		zf = s(z - zi);
	const l = THREE.MathUtils.lerp;
	const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz);
	return l(
		l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
		l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
		zf
	);
}

/** Minimum surface distance to any road, with a coarse pass to skip far-away faces quickly. */
function roadDistance(roads: Road[], dir: THREE.Vector3): number {
	let best = -1;
	for (const road of roads) {
		let coarse = -1;
		let coarseIdx = 0;
		for (let i = 0; i < road.count; i += 12) {
			const d = road.samples[i].dot(dir);
			if (d > coarse) {
				coarse = d;
				coarseIdx = i;
			}
		}
		// Refine around the best coarse sample.
		for (let k = -12; k <= 12; k++) {
			const d = road.samples[(coarseIdx + k + road.count) % road.count].dot(dir);
			if (d > best) best = d;
		}
	}
	return Math.acos(Math.min(1, best)) * PLANET_RADIUS;
}

/**
 * The planet: a faceted sphere painted per-face with grass, dry patches,
 * and red laterite shoulders along the roads.
 */
export function createPlanet(roads: Road[], patches: GroundPatch[]): THREE.Mesh {
	const geo = new THREE.IcosahedronGeometry(PLANET_RADIUS, 36);
	const pos = geo.attributes.position;
	const colors = new Float32Array(pos.count * 3);

	const grass = new THREE.Color(PALETTE.grass);
	const grassDark = new THREE.Color(PALETTE.grassDark);
	const grassDry = new THREE.Color(PALETTE.grassDry);
	const laterite = new THREE.Color(PALETTE.laterite);
	const lateriteLight = new THREE.Color(PALETTE.lateriteLight);
	const patchColors = patches.map((p) => new THREE.Color(p.color));

	const a = new THREE.Vector3(),
		b = new THREE.Vector3(),
		c = new THREE.Vector3();
	const centre = new THREE.Vector3();
	const col = new THREE.Color();

	for (let i = 0; i < pos.count; i += 3) {
		a.fromBufferAttribute(pos, i);
		b.fromBufferAttribute(pos, i + 1);
		c.fromBufferAttribute(pos, i + 2);
		centre.copy(a).add(b).add(c).normalize();

		const n1 = valueNoise(centre.x * 6, centre.y * 6, centre.z * 6);
		const n2 = valueNoise(centre.x * 22 + 5, centre.y * 22, centre.z * 22);
		const d = roadDistance(roads, centre);

		if (d < ROAD_HALF_WIDTH + FOOTPATH_WIDTH * (0.75 + n2 * 0.5)) {
			col.copy(laterite).lerp(lateriteLight, n2);
		} else {
			col.copy(grass).lerp(grassDark, THREE.MathUtils.smoothstep(n1, 0.35, 0.7));
			if (n2 > 0.72) col.lerp(grassDry, 0.6);
			// Dusty fringe just beyond the footpath.
			const fringe =
				1 -
				THREE.MathUtils.smoothstep(
					d,
					ROAD_HALF_WIDTH + FOOTPATH_WIDTH,
					ROAD_HALF_WIDTH + FOOTPATH_WIDTH + 1.2
				);
			col.lerp(lateriteLight, fringe * 0.45 * n2);
		}

		patches.forEach((p, k) => {
			const pd = Math.acos(Math.min(1, p.dir.dot(centre))) * PLANET_RADIUS;
			if (pd < p.radius * (0.85 + n2 * 0.3)) col.copy(patchColors[k]).lerp(grassDry, n2 * 0.15);
		});

		for (let k = 0; k < 3; k++) col.toArray(colors, (i + k) * 3);
	}

	geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
	const mesh = new THREE.Mesh(geo, vertexColorToon());
	mesh.receiveShadow = true;
	mesh.name = 'planet';
	return mesh;
}
