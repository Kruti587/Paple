import * as THREE from 'three';
import { PALETTE } from '../constants';
import { box, cylinder, pick, range, sphere } from './util';

// All buildings are modelled facing +Z (towards the road), origin at ground centre.

export interface Building {
	group: THREE.Group;
	width: number;
	depth: number;
}

const FLOOR_H = 2.4;

/** Typical Bengaluru house/shop: pastel walls, sunshades, parapet + black water tank, or Mangalore-tile roof. */
export function createHouse(rand: () => number): Building {
	const g = new THREE.Group();
	const width = range(rand, 2.8, 4);
	const depth = range(rand, 2.8, 3.6);
	const tiled = rand() < 0.35;
	const floors = tiled ? 1 + (rand() < 0.3 ? 1 : 0) : 1 + Math.floor(rand() * 3);
	const shop = !tiled && rand() < 0.45;
	const wall = pick(rand, PALETTE.houses);
	const h = floors * FLOOR_H;
	const front = depth / 2;

	box(g, width + 0.1, 0.3, depth + 0.1, PALETTE.stoneShade, 0, 0.15, 0);
	box(g, width, h, depth, wall, 0, h / 2 + 0.3, 0);
	const top = h + 0.3;

	for (let f = 0; f < floors; f++) {
		const y0 = 0.3 + f * FLOOR_H;
		if (f === 0 && shop) {
			box(g, width * 0.75, 1.8, 0.06, pick(rand, PALETTE.shutters), 0, y0 + 0.9, front + 0.03);
			box(
				g,
				width * 0.85,
				0.45,
				0.1,
				pick(rand, ['#f5d547', '#e05a47', '#3b82c4', '#ffffff']),
				0,
				y0 + 2.05,
				front + 0.08
			);
			continue;
		}
		const windows = width > 3.3 ? 2 : 1;
		for (let w = 0; w < windows; w++) {
			const x = windows === 1 ? (f === 0 ? width * 0.2 : 0) : (w - 0.5) * width * 0.45;
			box(g, 0.75, 0.9, 0.06, PALETTE.window, x, y0 + 1.3, front + 0.03);
			// chajja (sunshade)
			box(g, 0.95, 0.06, 0.35, PALETTE.parapet, x, y0 + 1.85, front + 0.17);
		}
		if (f === 0) box(g, 0.75, 1.6, 0.06, PALETTE.door, -width * 0.25, y0 + 0.8, front + 0.03);
		else if (rand() < 0.5) {
			// balcony slab + railing
			box(g, width * 0.7, 0.1, 0.6, PALETTE.parapet, 0, y0 + 0.05, front + 0.3);
			box(g, width * 0.7, 0.45, 0.05, PALETTE.parapet, 0, y0 + 0.3, front + 0.58);
		}
	}

	if (tiled) {
		// Mangalore-tile pitched roof as a triangular prism.
		const r = (depth + 0.5) / Math.sqrt(3);
		const sy = 0.6;
		const roof = cylinder(g, r, r, width + 0.4, PALETTE.roofTile, 0, top + 0.5 * r * sy, 0, 3);
		roof.rotation.z = Math.PI / 2;
		roof.rotation.x = Math.PI / 2;
		roof.scale.set(1, 1, sy);
	} else {
		const t = 0.14;
		box(g, width, 0.45, t, PALETTE.parapet, 0, top + 0.22, front - t / 2);
		box(g, width, 0.45, t, PALETTE.parapet, 0, top + 0.22, -front + t / 2);
		box(g, t, 0.45, depth, PALETTE.parapet, width / 2 - t / 2, top + 0.22, 0);
		box(g, t, 0.45, depth, PALETTE.parapet, -width / 2 + t / 2, top + 0.22, 0);
		// black Sintex-style water tank on a stand
		const tx = (rand() < 0.5 ? -1 : 1) * (width / 2 - 0.6);
		box(g, 0.9, 0.3, 0.9, PALETTE.stoneShade, tx, top + 0.15, -front + 0.6);
		cylinder(g, 0.4, 0.42, 0.8, PALETTE.waterTank, tx, top + 0.7, -front + 0.6, 12);
		if (floors > 1 && rand() < 0.6) box(g, 1.2, 1.4, 1.2, wall, -tx * 0.6, top + 0.7, -front + 0.8);
	}

	return { group: g, width, depth };
}

/** Vidhana Soudha, scaled down: podium, colonnaded portico, central dome and four corner domes. */
export function createVidhanaSoudha(): Building {
	const g = new THREE.Group();
	const S = PALETTE.stone;
	const D = PALETTE.stoneShade;

	box(g, 11, 0.8, 5.6, D, 0, 0.4, 0);
	box(g, 10, 3.2, 4.4, S, 0, 2.4, -0.2);
	box(g, 10.3, 0.25, 4.7, D, 0, 4.1, -0.2);
	box(g, 7.6, 1.5, 3.6, S, 0, 4.95, -0.4);
	box(g, 7.9, 0.2, 3.9, D, 0, 5.8, -0.4);

	// Window rows
	for (let row = 0; row < 2; row++)
		for (let i = 0; i < 9; i++) {
			if (Math.abs(i - 4) < 1.5) continue;
			box(g, 0.45, 0.8, 0.05, PALETTE.window, (i - 4) * 1.1, 1.7 + row * 1.4, 2.03);
		}

	// Portico: steps, 6 columns, entablature
	for (let s = 0; s < 3; s++)
		box(g, 4.4 - s * 0.3, 0.27, 0.5, D, 0, 0.13 + s * 0.27, 3.2 - s * 0.35);
	for (let i = 0; i < 6; i++) cylinder(g, 0.16, 0.18, 3.1, S, (i - 2.5) * 0.72, 2.35, 2.55, 10);
	box(g, 4.6, 0.5, 1.3, D, 0, 4.1, 2.3);
	box(g, 4.2, 0.35, 1.0, S, 0, 4.5, 2.2);

	// Central dome
	cylinder(g, 1.4, 1.5, 0.9, S, 0, 6.35, -0.4, 16);
	const dome = sphere(g, 1.4, D, 0, 6.8, -0.4, 16);
	dome.scale.set(1, 1.05, 1);
	cylinder(g, 0.12, 0.2, 0.7, S, 0, 8.4, -0.4, 8);
	sphere(g, 0.16, PALETTE.gold, 0, 8.85, -0.4, 8);

	// Corner domes
	for (const x of [-4.6, 4.6])
		for (const z of [1.5, -1.9]) {
			cylinder(g, 0.45, 0.5, 0.6, S, x, 4.5, z, 10);
			sphere(g, 0.45, D, x, 4.85, z, 10);
			sphere(g, 0.08, PALETTE.gold, x, 5.4, z, 6);
		}

	return { group: g, width: 11, depth: 6.4 };
}

/** South Indian temple gopuram with tiered, painted storeys and golden kalasams. */
export function createGopuram(): Building {
	const g = new THREE.Group();
	box(g, 4.2, 2.2, 3, PALETTE.stone, 0, 1.1, 0);
	box(g, 1.1, 1.8, 0.08, '#3a2f2a', 0, 0.9, 1.52);
	box(g, 1.5, 0.2, 0.2, PALETTE.gold, 0, 1.9, 1.55);

	const colors = [
		PALETTE.templeOchre,
		PALETTE.templeRed,
		PALETTE.templeBlue,
		PALETTE.templeGreen,
		PALETTE.templeOchre
	];
	let y = 2.2;
	for (let i = 0; i < colors.length; i++) {
		const w = 3.8 - i * 0.55;
		const d = 2.7 - i * 0.38;
		box(g, w + 0.2, 0.12, d + 0.2, PALETTE.parapet, 0, y + 0.06, 0);
		box(g, w, 0.72, d, colors[i], 0, y + 0.48, 0);
		// niches with little figures
		for (let k = -1; k <= 1; k++)
			box(g, 0.22, 0.4, 0.05, colors[(i + 2) % colors.length], k * w * 0.3, y + 0.5, d / 2 + 0.02);
		y += 0.84;
	}
	const vault = cylinder(g, 0.55, 0.55, 1.6, PALETTE.templeOchre, 0, y + 0.3, 0, 12);
	vault.rotation.z = Math.PI / 2;
	for (let k = -2; k <= 2; k++) {
		cylinder(g, 0.02, 0.1, 0.3, PALETTE.gold, k * 0.35, y + 1.0, 0, 6);
		sphere(g, 0.07, PALETTE.gold, k * 0.35, y + 0.88, 0, 6);
	}

	// Small shrine behind
	box(g, 2.4, 1.8, 2.4, PALETTE.stone, 0, 0.9, -2.9);
	cylinder(g, 0.1, 1.1, 1.3, PALETTE.templeOchre, 0, 2.45, -2.9, 8);
	sphere(g, 0.15, PALETTE.gold, 0, 3.2, -2.9, 8);

	return { group: g, width: 4.4, depth: 7 };
}
