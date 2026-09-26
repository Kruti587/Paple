import * as THREE from 'three';
import { toon } from '../materials';

type Color = THREE.ColorRepresentation;

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
) => add(parent, new THREE.BoxGeometry(w, h, d), color, x, y, z);

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
) => add(parent, new THREE.CylinderGeometry(rTop, rBottom, h, segments), color, x, y, z);

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
