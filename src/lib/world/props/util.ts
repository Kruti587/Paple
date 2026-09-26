import * as THREE from 'three';
import { toon } from '../materials';
import { PLANET_RADIUS } from '../constants';

type Color = THREE.ColorRepresentation;

/** Bends a geometry over the planet sphere so flat bottoms sit flush on the curved surface. */
function curve(geo: THREE.BufferGeometry): THREE.BufferGeometry {
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const z = pos.getZ(i);
		const r2 = x * x + z * z;
		if (r2 > 0.001) {
			const drop = PLANET_RADIUS - Math.sqrt(Math.max(0, PLANET_RADIUS * PLANET_RADIUS - r2));
			pos.setY(i, pos.getY(i) - drop);
		}
	}
	geo.computeVertexNormals();
	return geo;
}

/** Adds a mesh to `parent` at (x, y, z) and returns it — keeps prop code compact. */
export function add(
	parent: THREE.Object3D,
	geometry: THREE.BufferGeometry,
	color: Color,
	x = 0,
	y = 0,
	z = 0
): THREE.Mesh {
	const mesh = new THREE.Mesh(geometry, toon(color));
	mesh.position.set(x, y, z);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	parent.add(mesh);
	return mesh;
}

export const box = (
	parent: THREE.Object3D,
	w: number,
	h: number,
	d: number,
	color: Color,
	x = 0,
	y = 0,
	z = 0
) => {
	const sx = Math.max(1, Math.ceil(w * 1.2));
	const sz = Math.max(1, Math.ceil(d * 1.2));
	const geo = new THREE.BoxGeometry(w, h, d, sx, 1, sz);
	return add(parent, curve(geo), color, x, y, z);
};

export const cylinder = (
	parent: THREE.Object3D,
	rTop: number,
	rBottom: number,
	h: number,
	color: Color,
	x = 0,
	y = 0,
	z = 0,
	segments = 10
) => {
	const geo = new THREE.CylinderGeometry(rTop, rBottom, h, segments);
	return add(parent, curve(geo), color, x, y, z);
};

export const sphere = (
	parent: THREE.Object3D,
	r: number,
	color: Color,
	x = 0,
	y = 0,
	z = 0,
	segments = 10
) => add(parent, new THREE.SphereGeometry(r, segments, Math.max(6, segments - 2)), color, x, y, z);

/** Low-poly faceted blob — canopies, bushes, clouds. */
export const blob = (parent: THREE.Object3D, r: number, color: Color, x = 0, y = 0, z = 0) => {
	// Non-indexed geometry + recomputed normals = per-face (faceted) shading.
	const geo = new THREE.IcosahedronGeometry(r, 1);
	geo.computeVertexNormals();
	return add(parent, geo, color, x, y, z);
};

export function pick<T>(rand: () => number, items: readonly T[]): T {
	return items[Math.floor(rand() * items.length)];
}

export const range = (rand: () => number, min: number, max: number) => min + rand() * (max - min);
