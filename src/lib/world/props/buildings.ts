import * as THREE from 'three';
import { PALETTE } from '../constants';
import { blob, box, cylinder, pick, range, sphere } from './util';

// All buildings are modelled facing +Z (towards the road), origin at ground centre.

export interface Building {
	group: THREE.Group;
	width: number;
	depth: number;
}

const FLOOR_H = 2.4;

/** Most windows glow at night; a few stay dark so the street looks lived-in. */
const windowColor = (rand: () => number) => (rand() < 0.6 ? PALETTE.windowLit : PALETTE.window);

/** Parapet wall around a flat roof. */
function parapet(
	g: THREE.Group,
	width: number,
	depth: number,
	top: number,
	color: string,
	z = 0,
	t = 0.14
) {
	const front = depth / 2;
	box(g, width, 0.45, t, color, 0, top + 0.22, z + front - t / 2);
	box(g, width, 0.45, t, color, 0, top + 0.22, z - front + t / 2);
	box(g, t, 0.45, depth, color, width / 2 - t / 2, top + 0.22, z);
	box(g, t, 0.45, depth, color, -width / 2 + t / 2, top + 0.22, z);
}

/** Balcony slab with a painted grill (vertical bars) and potted plants. */
function grillBalcony(
	g: THREE.Group,
	rand: () => number,
	width: number,
	x: number,
	y: number,
	z: number,
	slab: string,
	grill: string
) {
	box(g, width, 0.1, 0.65, slab, x, y, z + 0.32);
	box(g, width, 0.05, 0.05, grill, x, y + 0.55, z + 0.63);
	const bars = Math.max(3, Math.round(width / 0.22));
	for (let i = 0; i <= bars; i++)
		box(g, 0.03, 0.5, 0.03, grill, x - width / 2 + (i / bars) * width, y + 0.3, z + 0.63);
	for (let i = 0; i < 2; i++) {
		if (rand() < 0.4) continue;
		const px = x + (i === 0 ? -1 : 1) * width * 0.3;
		cylinder(g, 0.09, 0.07, 0.16, '#b5543a', px, y + 0.13, z + 0.45, 8);
		blob(
			g,
			0.14,
			pick(rand, [PALETTE.bush, PALETTE.rainTreeLight, '#e84a8a']),
			px,
			y + 0.3,
			z + 0.45
		);
	}
}

/**
 * Bengaluru two-storey house: vibrant paint with contrasting trim, sunshades over every window,
 * a grilled balcony with potted plants, an external staircase up the side, a compound wall and
 * gate, and a roof with a black water tank, stair room and sometimes a dish antenna.
 * A minority are older single-storey homes with Mangalore-tile roofs, or shops with a flat above.
 */
export function createHouse(rand: () => number): Building {
	const g = new THREE.Group();
	const width = range(rand, 3.0, 4.2);
	const bodyDepth = range(rand, 2.8, 3.4);
	const tiled = rand() < 0.18;
	const floors = tiled ? 1 : rand() < 0.82 ? 2 : 3;
	const shop = !tiled && rand() < 0.3;
	const wall = pick(rand, PALETTE.houses);
	const trim = pick(rand, PALETTE.trims);
	const grill = pick(rand, PALETTE.grill);
	const yard = shop ? 0 : 0.8; // compound in front of homes
	const depth = bodyDepth + yard;
	const bz = -yard / 2; // body centre (pushed back behind the compound)
	const front = bz + bodyDepth / 2;
	const h = floors * FLOOR_H;

	box(g, width + 0.1, 0.3, bodyDepth + 0.1, PALETTE.stoneShade, 0, 0.15, bz);
	box(g, width, h, bodyDepth, wall, 0, h / 2 + 0.3, bz);
	// Painted band between floors
	for (let f = 1; f < floors; f++)
		box(g, width + 0.06, 0.12, bodyDepth + 0.06, trim, 0, 0.3 + f * FLOOR_H, bz);
	const top = h + 0.3;

	// External staircase to the first floor, up one side wall (classic rental-portion house).
	const stairSide = rand() < 0.5 ? -1 : 1;
	const hasStairs = floors > 1 && !shop && rand() < 0.7;
	if (hasStairs) {
		const steps = 9;
		for (let s = 0; s < steps; s++) {
			const sy = 0.3 + (s + 0.5) * (FLOOR_H / steps);
			box(
				g,
				0.55,
				FLOOR_H / steps,
				0.32,
				PALETTE.stoneShade,
				stairSide * (width / 2 + 0.28),
				sy,
				front - 0.3 - s * 0.26
			);
		}
		const rail = box(
			g,
			0.04,
			0.04,
			steps * 0.27,
			grill,
			stairSide * (width / 2 + 0.55),
			0.3 + FLOOR_H / 2 + 0.55,
			front - 0.3 - (steps - 1) * 0.13
		);
		rail.rotation.x = Math.atan2(FLOOR_H, steps * 0.26);
	}

	for (let f = 0; f < floors; f++) {
		const y0 = 0.3 + f * FLOOR_H;
		if (f === 0 && shop) {
			box(g, width * 0.78, 1.8, 0.06, pick(rand, PALETTE.shutters), 0, y0 + 0.9, front + 0.03);
			box(
				g,
				width * 0.9,
				0.45,
				0.1,
				pick(rand, ['#f5d547', '#e05a47', '#3b82c4', '#ffffff', '#2ecc71']),
				0,
				y0 + 2.05,
				front + 0.08
			);
			continue;
		}
		const windows = width > 3.5 ? 2 : 1;
		for (let w = 0; w < windows; w++) {
			const x = windows === 1 ? (f === 0 ? width * 0.2 : -width * 0.15) : (w - 0.5) * width * 0.45;
			box(g, 0.75, 0.9, 0.06, windowColor(rand), x, y0 + 1.3, front + 0.03);
			// chajja (sunshade) in the trim colour
			box(g, 0.95, 0.06, 0.35, trim, x, y0 + 1.85, front + 0.17);
		}
		if (f === 0) box(g, 0.75, 1.65, 0.06, PALETTE.door, -width * 0.25, y0 + 0.83, front + 0.03);
		else if (rand() < 0.75) grillBalcony(g, rand, width * 0.6, width * 0.1, y0, front, trim, grill);
	}

	if (tiled) {
		// Mangalore-tile pitched roof as a triangular prism.
		const r = (bodyDepth + 0.5) / Math.sqrt(3);
		const sy = 0.6;
		const roof = cylinder(g, r, r, width + 0.4, PALETTE.roofTile, 0, top + 0.5 * r * sy, bz, 3);
		roof.rotation.z = Math.PI / 2;
		roof.rotation.x = Math.PI / 2;
		roof.scale.set(1, 1, sy);
	} else {
		parapet(g, width, bodyDepth, top, trim, bz);
		// Black Sintex-style water tank on a stand
		const tx = -stairSide * (width / 2 - 0.6);
		box(g, 0.9, 0.3, 0.9, PALETTE.stoneShade, tx, top + 0.15, bz - bodyDepth / 2 + 0.6);
		cylinder(g, 0.4, 0.42, 0.8, PALETTE.waterTank, tx, top + 0.7, bz - bodyDepth / 2 + 0.6, 12);
		// Stair room ("mumty") on the roof
		if (rand() < 0.65)
			box(
				g,
				1.2,
				1.4,
				1.2,
				wall,
				stairSide * (width / 2 - 0.7),
				top + 0.7,
				bz - bodyDepth / 2 + 0.8
			);
		// Dish antenna
		if (rand() < 0.45) {
			const dish = cylinder(g, 0.22, 0.05, 0.08, '#e8e8e8', 0, top + 0.75, bz, 10);
			dish.rotation.x = -0.9;
			box(g, 0.04, 0.5, 0.04, PALETTE.metal, 0, top + 0.45, bz - 0.05);
		}
	}

	// Compound wall with a gate in front of homes
	if (yard > 0) {
		const zWall = depth / 2 - 0.06;
		const gateW = 1.0;
		const gateX = stairSide * (width / 2 - 0.2 - gateW / 2) * 0.5;
		const leftEnd = -width / 2;
		const rightEnd = width / 2;
		const segs: [number, number][] = [
			[leftEnd, gateX - gateW / 2],
			[gateX + gateW / 2, rightEnd]
		];
		for (const [a, b] of segs)
			if (b - a > 0.05) box(g, b - a, 0.8, 0.12, trim, (a + b) / 2, 0.4, zWall);
		for (const s of [-1, 1])
			box(g, 0.12, 0.8, yard, trim, s * (width / 2 - 0.06), 0.4, zWall - yard / 2);
		box(g, gateW, 0.75, 0.04, grill, gateX, 0.45, zWall);
		// Rangoli space / tulsi pot beside the gate
		if (rand() < 0.5) {
			cylinder(g, 0.14, 0.12, 0.5, '#d9a441', -gateX * 0.4, 0.25, zWall - yard / 2, 8);
			blob(g, 0.15, PALETTE.bush, -gateX * 0.4, 0.62, zWall - yard / 2);
		}
	}

	// Keep the footprint centred when the staircase sticks out of one side.
	if (hasStairs) g.children.forEach((c) => (c.position.x -= stairSide * 0.28));
	return { group: g, width: width + (hasStairs ? 0.56 : 0), depth };
}

/** Narrow Bangalore row-house — shared-wall, 2-story, clothes line, sometimes a small balcony. */
export function createRowHouse(rand: () => number): Building {
	const g = new THREE.Group();
	const width = range(rand, 2.0, 3.0);
	const depth = range(rand, 2.4, 3.2);
	const floors = 2;
	const wall = pick(rand, PALETTE.houses);
	const trim = pick(rand, PALETTE.trims);
	const h = floors * FLOOR_H;
	const front = depth / 2;

	// Plinth
	box(g, width + 0.06, 0.25, depth + 0.06, PALETTE.stoneShade, 0, 0.12, 0);
	// Main mass
	box(g, width, h, depth, wall, 0, h / 2 + 0.25, 0);
	const top = h + 0.25;

	// Ground floor: door + one window
	box(g, 0.6, 1.5, 0.05, PALETTE.door, -width * 0.2, 1.0, front + 0.025);
	box(g, 0.55, 0.7, 0.05, windowColor(rand), width * 0.22, 1.4, front + 0.025);
	box(g, 0.7, 0.05, 0.25, trim, width * 0.22, 1.8, front + 0.12); // chajja

	// First floor: windows + optional balcony
	for (let w = 0; w < (width > 2.5 ? 2 : 1); w++) {
		const x = width > 2.5 ? (w - 0.5) * width * 0.4 : 0;
		box(g, 0.55, 0.7, 0.05, windowColor(rand), x, FLOOR_H + 0.25 + 1.3, front + 0.025);
		box(g, 0.7, 0.05, 0.25, trim, x, FLOOR_H + 0.25 + 1.75, front + 0.12);
	}
	if (rand() < 0.6) {
		// Small balcony slab + railing
		box(g, width * 0.6, 0.08, 0.5, trim, 0, FLOOR_H + 0.28, front + 0.25);
		box(g, width * 0.6, 0.35, 0.04, trim, 0, FLOOR_H + 0.48, front + 0.48);
	}

	// Flat roof with parapet
	const t = 0.1;
	box(g, width, 0.35, t, trim, 0, top + 0.17, front - t / 2);
	box(g, width, 0.35, t, trim, 0, top + 0.17, -front + t / 2);
	box(g, t, 0.35, depth, trim, width / 2 - t / 2, top + 0.17, 0);
	box(g, t, 0.35, depth, trim, -width / 2 + t / 2, top + 0.17, 0);

	// Water tank (small)
	cylinder(g, 0.3, 0.32, 0.6, PALETTE.waterTank, 0, top + 0.65, -front * 0.5, 10);

	// Clothes line (a thin bar across the front)
	if (rand() < 0.5) {
		box(g, width * 0.7, 0.02, 0.02, '#888', 0, top - 0.3, front + 0.35);
	}

	return { group: g, width, depth };
}

/** 3-4 story apartment block — wider, flat roof, staircase tower, satellite dishes. */
export function createApartmentBlock(rand: () => number): Building {
	const g = new THREE.Group();
	const width = range(rand, 3.8, 5.5);
	const depth = range(rand, 3.0, 4.0);
	const floors = 3;
	const wall = pick(rand, PALETTE.houses);
	const h = floors * FLOOR_H;
	const front = depth / 2;

	// Plinth
	box(g, width + 0.12, 0.35, depth + 0.12, PALETTE.stoneShade, 0, 0.17, 0);
	// Main block
	box(g, width, h, depth, wall, 0, h / 2 + 0.35, 0);
	const top = h + 0.35;

	// Floor-by-floor windows + balconies
	for (let f = 0; f < floors; f++) {
		const y0 = 0.35 + f * FLOOR_H;
		const windows = Math.floor(width / 1.3);
		for (let w = 0; w < windows; w++) {
			const x = (w - (windows - 1) / 2) * 1.15;
			if (f === 0 && w === Math.floor(windows / 2)) {
				// Main entrance
				box(g, 0.9, 1.8, 0.05, PALETTE.door, x, y0 + 0.9, front + 0.025);
				continue;
			}
			box(g, 0.6, 0.8, 0.05, windowColor(rand), x, y0 + 1.3, front + 0.025);
			box(g, 0.75, 0.05, 0.22, PALETTE.parapet, x, y0 + 1.8, front + 0.11);
		}
		// Balcony on upper floors
		if (f >= 1 && rand() < 0.55) {
			box(g, width * 0.8, 0.08, 0.55, PALETTE.parapet, 0, y0 + 0.06, front + 0.27);
			box(g, width * 0.8, 0.4, 0.04, PALETTE.parapet, 0, y0 + 0.28, front + 0.52);
		}
	}

	// Staircase tower on the back
	const stairW = range(rand, 1.0, 1.5);
	box(
		g,
		stairW,
		h + 1.5,
		depth * 0.4,
		wall,
		(rand() < 0.5 ? -1 : 1) * (width / 2 - stairW / 2),
		(h + 1.5) / 2 + 0.35,
		-front + depth * 0.2
	);

	// Flat roof parapet
	const pt = 0.12;
	box(g, width, 0.4, pt, PALETTE.parapet, 0, top + 0.2, front - pt / 2);
	box(g, width, 0.4, pt, PALETTE.parapet, 0, top + 0.2, -front + pt / 2);
	box(g, pt, 0.4, depth, PALETTE.parapet, width / 2 - pt / 2, top + 0.2, 0);
	box(g, pt, 0.4, depth, PALETTE.parapet, -width / 2 + pt / 2, top + 0.2, 0);

	// Water tanks (often 2 on apartments)
	for (let i = 0; i < 2; i++) {
		const tx = (i === 0 ? -1 : 1) * (width / 2 - 0.6);
		box(g, 0.7, 0.2, 0.7, PALETTE.stoneShade, tx, top + 0.1, -front + 0.5);
		cylinder(g, 0.35, 0.38, 0.7, PALETTE.waterTank, tx, top + 0.55, -front + 0.5, 10);
	}

	// TV / satellite dish on roof
	if (rand() < 0.6) {
		const dx = range(rand, -width * 0.3, width * 0.3);
		box(g, 0.04, 0.6, 0.04, PALETTE.metal, dx, top + 0.3, -front + 0.4);
		sphere(g, 0.18, PALETTE.metal, dx, top + 0.65, -front + 0.55, 6);
	}

	return { group: g, width, depth };
}

/** Small corner shop — single story, wide front shutter, signboard, sometimes an awning. */
export function createCornerShop(rand: () => number): Building {
	const g = new THREE.Group();
	const width = range(rand, 2.2, 3.5);
	const depth = range(rand, 2.2, 3.0);
	const wall = pick(rand, PALETTE.houses);
	const h = FLOOR_H;
	const front = depth / 2;

	// Plinth
	box(g, width + 0.08, 0.2, depth + 0.08, PALETTE.stoneShade, 0, 0.1, 0);
	// Walls
	box(g, width, h, depth, wall, 0, h / 2 + 0.2, 0);
	const top = h + 0.2;

	// Wide roller shutter / shop front
	const shutterColor = pick(rand, PALETTE.shutters);
	box(g, width * 0.8, h * 0.75, 0.04, shutterColor, 0, h * 0.375 + 0.2, front + 0.02);

	// Signboard above
	const signColor = pick(rand, ['#f5d547', '#e05a47', '#3b82c4', '#ffffff', '#2ecc71', '#e67e22']);
	box(g, width * 0.9, 0.4, 0.08, signColor, 0, top - 0.1, front + 0.06);

	// Awning / tarp over footpath
	if (rand() < 0.5) {
		box(g, width + 0.3, 0.03, 1.0, PALETTE.tarpBlue, 0, top - 0.3, front + 0.5);
		// Support poles
		for (const sx of [-1, 1]) {
			box(
				g,
				0.04,
				top - 0.3,
				0.04,
				PALETTE.metal,
				sx * (width / 2 + 0.1),
				(top - 0.3) / 2,
				front + 0.95
			);
		}
	}

	// Most shops have the owner's flat above (a second storey), with its own sunshade and parapet.
	const trim = pick(rand, PALETTE.trims);
	if (rand() < 0.7) {
		box(g, width, FLOOR_H, depth, wall, 0, top + FLOOR_H / 2, 0);
		for (const x of width > 2.8 ? [-width * 0.22, width * 0.22] : [0]) {
			box(g, 0.7, 0.85, 0.05, windowColor(rand), x, top + 1.2, front + 0.025);
			box(g, 0.9, 0.06, 0.32, trim, x, top + 1.75, front + 0.16);
		}
		parapet(g, width, depth, top + FLOOR_H, trim, 0, 0.1);
		cylinder(
			g,
			0.32,
			0.34,
			0.65,
			PALETTE.waterTank,
			width / 2 - 0.5,
			top + FLOOR_H + 0.75,
			-front + 0.5,
			10
		);
	} else {
		box(g, width, 0.25, 0.08, trim, 0, top + 0.12, front - 0.04);
		box(g, width, 0.25, 0.08, trim, 0, top + 0.12, -front + 0.04);
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
			box(g, 0.45, 0.8, 0.05, PALETTE.windowLit, (i - 4) * 1.1, 1.7 + row * 1.4, 2.03);
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
