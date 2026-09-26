import * as THREE from 'three';
import { PALETTE, PLANET_RADIUS, ROAD_HALF_WIDTH } from './constants';
import { toon } from './materials';
import { placeOnSurface, toTangent } from './sphere';

export interface RoadSpec {
	/** Orientation of the base loop (a circle in the XZ plane before rotation). */
	rotation: THREE.Euler;
	/** Latitude wobble so roads meander instead of being perfect great circles. */
	amplitude: number;
	frequency: number;
	phase: number;
}

export interface SurfaceFrame {
	up: THREE.Vector3;
	forward: THREE.Vector3;
	right: THREE.Vector3;
}

const ROAD_HEIGHT = 0.06;

/** A closed meandering loop around the planet, sampled densely. */
export class Road {
	readonly samples: THREE.Vector3[] = [];
	readonly tangents: THREE.Vector3[] = [];
	readonly rights: THREE.Vector3[] = [];
	readonly length: number;

	constructor(
		spec: RoadSpec,
		readonly count = 720
	) {
		const q = new THREE.Quaternion().setFromEuler(spec.rotation);
		const base = (t: number) =>
			new THREE.Vector3(
				Math.cos(t),
				spec.amplitude * Math.sin(spec.frequency * t + spec.phase),
				Math.sin(t)
			)
				.normalize()
				.applyQuaternion(q);

		let length = 0;
		for (let i = 0; i < count; i++) {
			const t = (i / count) * Math.PI * 2;
			const up = base(t);
			const forward = toTangent(base(t + 1e-3).sub(base(t - 1e-3)), up);
			this.samples.push(up);
			this.tangents.push(forward);
			this.rights.push(new THREE.Vector3().crossVectors(forward, up).normalize());
			if (i > 0) length += up.distanceTo(this.samples[i - 1]) * PLANET_RADIUS;
		}
		this.length = length + this.samples[0].distanceTo(this.samples[count - 1]) * PLANET_RADIUS;
	}

	/** Frame at loop parameter u ∈ [0,1), shifted `offset` metres to the right (negative = left). */
	frameAt(u: number, offset = 0): SurfaceFrame {
		const f = (((u % 1) + 1) % 1) * this.count;
		const i = Math.floor(f);
		const j = (i + 1) % this.count;
		const a = f - i;
		const up = this.samples[i].clone().lerp(this.samples[j], a).normalize();
		const forward = toTangent(this.tangents[i].clone().lerp(this.tangents[j], a), up);
		let right = new THREE.Vector3().crossVectors(forward, up).normalize();
		if (offset !== 0) {
			up.multiplyScalar(PLANET_RADIUS).addScaledVector(right, offset).normalize();
			toTangent(forward, up);
			right = new THREE.Vector3().crossVectors(forward, up).normalize();
		}
		return { up, forward, right };
	}

	/** Loop parameter of the sample closest to `dir`. */
	nearestU(dir: THREE.Vector3): number {
		let best = -1;
		let idx = 0;
		this.samples.forEach((s, i) => {
			const d = s.dot(dir);
			if (d > best) {
				best = d;
				idx = i;
			}
		});
		return idx / this.count;
	}

	/** Road coordinates of `dir`: loop parameter u and signed lateral offset (m, + = road's right). */
	project(dir: THREE.Vector3): { u: number; offset: number } {
		const u = this.nearestU(dir);
		const i = Math.round(u * this.count) % this.count;
		const offset = dir.clone().sub(this.samples[i]).dot(this.rights[i]) * PLANET_RADIUS;
		return { u, offset };
	}

	/** Surface distance (m) from unit direction `dir` to the road centreline. */
	distanceTo(dir: THREE.Vector3): number {
		let best = -1;
		for (const s of this.samples) {
			const d = s.dot(dir);
			if (d > best) best = d;
		}
		return Math.acos(Math.min(1, best)) * PLANET_RADIUS;
	}
}

export function distanceToRoads(roads: Road[], dir: THREE.Vector3): number {
	let best = Infinity;
	for (const r of roads) best = Math.min(best, r.distanceTo(dir));
	return best;
}

/** Curved disc hugging the sphere, centred on `up`. */
export function sphereCap(
	up: THREE.Vector3,
	radius: number,
	height: number,
	material: THREE.Material,
	segments = 32
): THREE.Mesh {
	const r = PLANET_RADIUS + height;
	const geo = new THREE.SphereGeometry(r, segments, 4, 0, Math.PI * 2, 0, radius / PLANET_RADIUS);
	const mesh = new THREE.Mesh(geo, material);
	mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
	return mesh;
}

/** Junction centres where two roads cross. */
export function findJunctions(a: Road, b: Road): THREE.Vector3[] {
	const hits: number[] = [];
	for (let i = 0; i < a.count; i++) if (b.distanceTo(a.samples[i]) < 0.3) hits.push(i);
	const junctions: THREE.Vector3[] = [];
	let group: number[] = [];
	const flush = () => {
		if (group.length) junctions.push(a.samples[group[Math.floor(group.length / 2)]].clone());
		group = [];
	};
	for (const i of hits) {
		if (group.length && i - group[group.length - 1] > 2) flush();
		group.push(i);
	}
	flush();
	// Merge a group that wraps around index 0.
	if (junctions.length > 1 && hits[0] === 0 && hits[hits.length - 1] === a.count - 1)
		junctions.shift();
	return junctions;
}

function stripGeometry(
	road: Road,
	left: number,
	right: number,
	height: number
): THREE.BufferGeometry {
	const pos: number[] = [];
	const nrm: number[] = [];
	const idx: number[] = [];
	const p = new THREE.Vector3();
	const r = PLANET_RADIUS + height;
	for (let i = 0; i <= road.count; i++) {
		const k = i % road.count;
		for (const off of [left, right]) {
			p.copy(road.samples[k])
				.multiplyScalar(PLANET_RADIUS)
				.addScaledVector(road.rights[k], off)
				.normalize();
			nrm.push(p.x, p.y, p.z);
			p.multiplyScalar(r);
			pos.push(p.x, p.y, p.z);
		}
		if (i < road.count) {
			const a = i * 2;
			// Counter-clockwise seen from above (outside the planet).
			idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
		}
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
	geo.setIndex(idx);
	return geo;
}

/** Asphalt, painted black-and-yellow kerbs, dashed centre lines and junction pads. */
export function buildRoadNetwork(roads: Road[]): {
	group: THREE.Group;
	junctions: THREE.Vector3[];
} {
	const group = new THREE.Group();
	const asphalt = toon(PALETTE.asphalt);

	const junctions: THREE.Vector3[] = [];
	for (let i = 0; i < roads.length; i++)
		for (let j = i + 1; j < roads.length; j++) junctions.push(...findJunctions(roads[i], roads[j]));

	const kerbGeo = new THREE.BoxGeometry(0.22, 0.2, 0.6);
	const dashGeo = new THREE.BoxGeometry(0.14, 0.02, 1.0);
	const kerbMats = [toon(PALETTE.kerbYellow), toon(PALETTE.kerbBlack)];
	const laneMat = toon(PALETTE.laneMark);
	const nearJunction = (dir: THREE.Vector3, pad: number) =>
		junctions.some((j) => j.distanceTo(dir) * PLANET_RADIUS < ROAD_HALF_WIDTH + pad);

	roads.forEach((road, ri) => {
		group.add(
			new THREE.Mesh(stripGeometry(road, -ROAD_HALF_WIDTH, ROAD_HALF_WIDTH, ROAD_HEIGHT), asphalt)
		);
		const others = roads.filter((_, k) => k !== ri);

		const kerbCount = Math.floor(road.length / 0.6);
		for (let k = 0; k < kerbCount; k++) {
			for (const side of [-1, 1]) {
				const f = road.frameAt(k / kerbCount, side * (ROAD_HALF_WIDTH + 0.11));
				if (others.some((o) => o.distanceTo(f.up) < ROAD_HALF_WIDTH + 0.4)) continue;
				const kerb = new THREE.Mesh(kerbGeo, kerbMats[k % 2]);
				placeOnSurface(kerb, f.up, f.forward, 0.1);
				group.add(kerb);
			}
		}

		const dashCount = Math.floor(road.length / 2);
		for (let k = 0; k < dashCount; k++) {
			const f = road.frameAt(k / dashCount);
			if (nearJunction(f.up, 0.5)) continue;
			const dash = new THREE.Mesh(dashGeo, laneMat);
			placeOnSurface(dash, f.up, f.forward, ROAD_HEIGHT + 0.005);
			group.add(dash);
		}
	});

	for (const j of junctions)
		group.add(sphereCap(j, ROAD_HALF_WIDTH * 1.45, ROAD_HEIGHT + 0.004, asphalt));

	return { group, junctions };
}
