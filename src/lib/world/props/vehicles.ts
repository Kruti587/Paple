import * as THREE from 'three';
import { PALETTE } from '../constants';
import { box, cylinder, pick, sphere } from './util';

// Vehicles face +Z, origin at road level. Kept as separate objects (not merged) because they move.

function wheel(g: THREE.Object3D, r: number, w: number, x: number, z: number) {
	const m = cylinder(g, r, r, w, PALETTE.tyre, x, r, z, 10);
	m.rotation.z = Math.PI / 2;
}

function rider(g: THREE.Object3D, shirt: string, y: number, z: number, helmet?: string) {
	box(g, 0.34, 0.45, 0.22, shirt, 0, y + 0.22, z);
	sphere(g, 0.13, PALETTE.skin, 0, y + 0.58, z, 8);
	if (helmet) sphere(g, 0.15, helmet, 0, y + 0.62, z - 0.01, 8);
	else sphere(g, 0.135, '#2b2320', 0, y + 0.63, z - 0.02, 8);
}

/** Bengaluru auto-rickshaw: green body, yellow canopy, khaki-shirted driver. */
export function createAuto(): THREE.Group {
	const g = new THREE.Group();
	box(g, 1.2, 0.45, 2.0, PALETTE.autoGreen, 0, 0.55, -0.1);
	box(g, 0.85, 0.85, 0.45, PALETTE.autoGreen, 0, 0.9, 1.05);
	const glass = box(g, 0.82, 0.5, 0.04, '#bcd6db', 0, 1.55, 1.08);
	glass.rotation.x = -0.2;
	box(g, 1.3, 0.1, 1.9, PALETTE.autoYellow, 0, 1.85, -0.05);
	box(g, 1.25, 0.9, 0.4, PALETTE.autoYellow, 0, 1.35, -0.85);
	box(g, 1.26, 0.12, 0.42, PALETTE.kerbBlack, 0, 0.95, -0.85);
	for (const x of [-0.55, 0.55]) box(g, 0.05, 0.9, 0.05, PALETTE.kerbBlack, x, 1.38, 0.85);
	sphere(g, 0.08, '#fff6c9', 0, 1.2, 1.3, 8);
	wheel(g, 0.24, 0.16, 0, 1.0);
	wheel(g, 0.24, 0.16, -0.6, -0.65);
	wheel(g, 0.24, 0.16, 0.6, -0.65);
	rider(g, '#b59b6a', 0.75, 0.55);
	return g;
}

/** Two-wheeler with a helmeted rider. */
export function createScooter(rand: () => number): THREE.Group {
	const g = new THREE.Group();
	const body = pick(rand, ['#d9534f', '#3d7fc4', '#f2f2f2', '#2f2f2f', '#f0ad4e']);
	box(g, 0.32, 0.4, 1.1, body, 0, 0.5, 0);
	box(g, 0.34, 0.5, 0.2, body, 0, 0.75, 0.5);
	box(g, 0.3, 0.1, 0.55, PALETTE.kerbBlack, 0, 0.75, -0.2);
	box(g, 0.6, 0.04, 0.04, PALETTE.metal, 0, 1.05, 0.55);
	wheel(g, 0.2, 0.1, 0, 0.5);
	wheel(g, 0.2, 0.1, 0, -0.45);
	rider(
		g,
		pick(rand, ['#5b8bd0', '#e8e2d0', '#c0392b', '#6a8f3a']),
		0.8,
		-0.15,
		pick(rand, ['#e0e0e0', '#c0392b', '#2f2f2f'])
	);
	return g;
}
