import * as THREE from 'three';
import { PALETTE } from '../constants';
import { toon } from '../materials';
import { add, box, cylinder, pick, sphere } from './util';

// Street furniture, modelled facing +Z, origin at ground level.

/** Lamp post whose arm reaches towards +Z (the road). */
export function createStreetLamp(): THREE.Group {
	const g = new THREE.Group();
	cylinder(g, 0.05, 0.08, 4, PALETTE.metal, 0, 2, 0, 6);
	box(g, 0.07, 0.07, 1.0, PALETTE.metal, 0, 3.95, 0.45);
	box(g, 0.22, 0.1, 0.4, PALETTE.lampHead, 0, 3.88, 0.9);
	return g;
}

/** Concrete electricity pole with a cross-arm; returns wire attachment points in local space. */
export function createElectricPole(): { group: THREE.Group; attach: THREE.Vector3[] } {
	const g = new THREE.Group();
	cylinder(g, 0.07, 0.1, 5, '#b9b4aa', 0, 2.5, 0, 6);
	box(g, 1.1, 0.08, 0.08, PALETTE.kerbBlack, 0, 4.7, 0);
	const attach = [-0.45, 0, 0.45].map((x) => new THREE.Vector3(x, 4.78, 0));
	for (const a of attach) sphere(g, 0.04, '#dcdcdc', a.x, a.y - 0.04, a.z, 5);
	return { group: g, attach };
}

/** Sagging cables between consecutive world-space points (the tangle every Indian street has). */
export function createWires(
	pairs: [THREE.Vector3, THREE.Vector3][],
	up: (p: THREE.Vector3) => THREE.Vector3
): THREE.Group {
	const g = new THREE.Group();
	const mat = toon(PALETTE.kerbBlack);
	for (const [a, b] of pairs) {
		const mid = a.clone().lerp(b, 0.5);
		const sag = Math.min(0.6, a.distanceTo(b) * 0.06);
		mid.addScaledVector(up(mid), -sag);
		const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
		g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.015, 3), mat));
	}
	return g;
}

/** Tea stall (tapri) with a blue tarp awning, kettle and bench. */
export function createChaiStall(): THREE.Group {
	const g = new THREE.Group();
	box(g, 1.7, 1.0, 0.8, PALETTE.wood, 0, 0.5, 0);
	box(g, 1.8, 0.06, 0.9, '#c9a27a', 0, 1.03, 0);
	box(g, 1.7, 1.6, 0.1, PALETTE.wood, 0, 1.0, -0.45);
	for (const x of [-0.95, 0.95]) cylinder(g, 0.03, 0.03, 2.2, PALETTE.metal, x, 1.1, 0.7, 5);
	const tarp = box(g, 2.3, 0.05, 1.7, PALETTE.tarpBlue, 0, 2.15, 0.2);
	tarp.rotation.x = 0.18;
	cylinder(g, 0.14, 0.16, 0.3, PALETTE.metal, -0.4, 1.21, 0, 10);
	cylinder(g, 0.03, 0.03, 0.12, PALETTE.metal, -0.22, 1.28, 0, 5).rotation.z = 1.1;
	for (let i = 0; i < 4; i++)
		cylinder(g, 0.04, 0.035, 0.1, '#f2e6c8', 0.2 + i * 0.12, 1.11, 0.15, 6);
	for (let i = 0; i < 3; i++)
		cylinder(g, 0.1, 0.1, 0.22, '#e8d6a0', 0.35 + i * 0.22, 1.17, -0.2, 8);
	box(g, 0.9, 0.3, 0.05, '#f5d547', 0, 1.9, -0.42);
	// bench
	box(g, 1.4, 0.07, 0.35, PALETTE.wood, 0, 0.45, 1.4);
	for (const x of [-0.6, 0.6]) box(g, 0.07, 0.42, 0.3, PALETTE.wood, x, 0.21, 1.4);
	return g;
}

/** Push-cart (thela) piled with fruit. */
export function createFruitCart(rand: () => number): THREE.Group {
	const g = new THREE.Group();
	box(g, 1.8, 0.12, 0.9, PALETTE.wood, 0, 0.75, 0);
	for (const x of [-0.6, 0.6]) {
		const w = cylinder(g, 0.32, 0.32, 0.06, PALETTE.tyre, x, 0.32, 0.5, 12);
		w.rotation.x = Math.PI / 2;
		const w2 = cylinder(g, 0.32, 0.32, 0.06, PALETTE.tyre, x, 0.32, -0.5, 12);
		w2.rotation.x = Math.PI / 2;
	}
	box(g, 0.05, 0.05, 0.9, PALETTE.wood, -1.05, 0.8, 0);
	const fruits = ['#f2b233', '#e8d44d', '#c0392b', '#7cb342', '#f07c3a'];
	for (let i = 0; i < 26; i++) {
		sphere(
			g,
			0.09,
			pick(rand, fruits),
			(rand() - 0.5) * 1.5,
			0.86 + rand() * 0.12,
			(rand() - 0.5) * 0.7,
			6
		);
	}
	return g;
}

/** Zebu cow with a hump and painted horns — the road's true owner. */
export function createCow(lying = false): THREE.Group {
	const g = new THREE.Group();
	const W = PALETTE.cowWhite;
	const legY = lying ? 0 : 0.6;
	box(g, 0.55, 0.55, 1.25, W, 0, legY + 0.3, 0);
	box(g, 0.3, 0.25, 0.3, W, 0, legY + 0.65, 0.35);
	box(g, 0.32, 0.34, 0.45, W, 0, legY + 0.55, 0.8);
	box(g, 0.26, 0.2, 0.18, '#d8cfc2', 0, legY + 0.45, 1.05);
	for (const s of [-1, 1]) {
		const horn = cylinder(
			g,
			0.015,
			0.05,
			0.28,
			s < 0 ? '#e0613b' : '#3d7fc4',
			s * 0.13,
			legY + 0.82,
			0.75,
			5
		);
		horn.rotation.z = -s * 0.5;
		box(g, 0.14, 0.06, 0.1, '#d8cfc2', s * 0.22, legY + 0.6, 0.72);
	}
	if (!lying)
		for (const x of [-0.18, 0.18])
			for (const z of [-0.45, 0.45]) box(g, 0.11, 0.62, 0.11, W, x, 0.31, z);
	else for (const x of [-0.32, 0.32]) box(g, 0.14, 0.14, 0.9, W, x, 0.07, 0.05);
	const tail = box(g, 0.05, 0.55, 0.05, W, 0, legY + 0.15, -0.65);
	tail.rotation.x = 0.2;
	return g;
}

/** Flat rangoli pattern drawn at a doorstep. */
export function createRangoli(rand: () => number): THREE.Group {
	const g = new THREE.Group();
	const colors = ['#ffffff', '#e84a8a', '#f5c518', '#3d9be9', '#f07c3a', '#7cc242'];
	const ring = (r0: number, r1: number, color: string, y: number) => {
		const m = add(g, new THREE.RingGeometry(r0, r1, 24), color, 0, y, 0);
		m.rotation.x = -Math.PI / 2;
		m.castShadow = false;
	};
	ring(0, 0.62, pick(rand, colors), 0.02);
	ring(0.45, 0.55, '#ffffff', 0.025);
	ring(0, 0.2, pick(rand, colors), 0.03);
	for (let i = 0; i < 8; i++) {
		const a = (i / 8) * Math.PI * 2;
		const petal = add(
			g,
			new THREE.CircleGeometry(0.1, 10),
			colors[i % 2 ? 1 : 2],
			Math.cos(a) * 0.33,
			0.03,
			Math.sin(a) * 0.33
		);
		petal.rotation.x = -Math.PI / 2;
		petal.castShadow = false;
	}
	return g;
}

export function createBench(): THREE.Group {
	const g = new THREE.Group();
	box(g, 1.5, 0.08, 0.45, PALETTE.wood, 0, 0.45, 0);
	box(g, 1.5, 0.4, 0.06, PALETTE.wood, 0, 0.72, -0.2);
	for (const x of [-0.65, 0.65]) box(g, 0.08, 0.45, 0.45, PALETTE.kerbBlack, x, 0.22, 0);
	return g;
}

/** Traffic police podium with a striped umbrella — stands at the junction. */
export function createTrafficUmbrella(): THREE.Group {
	const g = new THREE.Group();
	cylinder(g, 0.5, 0.55, 0.3, PALETTE.kerbYellow, 0, 0.15, 0, 12);
	cylinder(g, 0.03, 0.03, 2.3, PALETTE.metal, 0, 1.4, 0, 5);
	add(g, new THREE.ConeGeometry(0.95, 0.4, 8), '#d9534f', 0, 2.5, 0);
	add(g, new THREE.ConeGeometry(0.5, 0.22, 8), '#ffffff', 0, 2.62, 0);
	return g;
}
