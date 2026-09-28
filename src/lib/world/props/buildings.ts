import * as THREE from 'three';
import { PALETTE } from '../constants';
import { toon } from '../materials';
import { blob, box, cylinder, pick, range, sphere } from './util';

// All buildings are modelled facing +Z (towards the road), origin at ground centre.

export interface Building {
	group: THREE.Group;
	width: number;
	depth: number;
	hollowFootprint?: boolean;
}

/** Triangular gable wall closing off the pitch ends of a Mangalore tile roof. */
function gableWall(
	g: THREE.Group,
	color: THREE.ColorRepresentation,
	x: number,
	yBase: number,
	zCenter: number,
	depth: number,
	height: number
) {
	const geo = new THREE.BufferGeometry();
	const halfD = depth / 2;
	const positions = new Float32Array([
		0, 0, -halfD,
		0, 0,  halfD,
		0, height, 0,
		0, 0,  halfD,
		0, 0, -halfD,
		0, height, 0
	]);
	geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geo.computeVertexNormals();
	const mesh = new THREE.Mesh(geo, toon(color));
	mesh.position.set(x, yBase, zCenter);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	g.add(mesh);
	return mesh;
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
		// Mangalore-tile pitched roof with symmetrical terracotta slopes
		const pitchH = 0.95;
		const overhangX = 0.25;
		const overhangZ = 0.25;
		const roofW = width + overhangX * 2;
		const run = bodyDepth / 2 + overhangZ;
		const slopeLen = Math.hypot(run, pitchH);
		const angle = Math.atan2(pitchH, run);

		// Front slope (facing street +Z)
		const frontSlope = box(g, roofW, 0.08, slopeLen, PALETTE.roofTile, 0, top + pitchH * 0.5, bz + run * 0.5);
		frontSlope.rotation.x = angle;

		// Back slope (facing back -Z)
		const backSlope = box(g, roofW, 0.08, slopeLen, PALETTE.roofTile, 0, top + pitchH * 0.5, bz - run * 0.5);
		backSlope.rotation.x = -angle;

		// Ridge cap tile running along the apex
		box(g, roofW + 0.04, 0.1, 0.24, PALETTE.roofTile, 0, top + pitchH + 0.04, bz);

		// Triangular gable end-walls seamlessly closing the sides
		gableWall(g, wall, -width / 2 + 0.03, top, bz, bodyDepth, pitchH);
		gableWall(g, wall,  width / 2 - 0.03, top, bz, bodyDepth, pitchH);
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

/** South Indian temple gopuram with tiered painted storeys, open entrance gateway, mandapa courtyard, Ganpati idol with lush marigold garlands, and the Divine Veena. */
export function createGopuram(): Building {
	const g = new THREE.Group();

	// ── 1. Temple Foundation & Entrance Steps ─────────────────────────────
	// Stone plinth floor
	box(g, 5.6, 0.16, 7.0, PALETTE.stone, 0, 0.08, 0);

	// Wide stone steps (Sopana) descending to the street in front (+Z)
	box(g, 3.6, 0.09, 0.5, PALETTE.stoneShade, 0, 0.045, 3.75);
	box(g, 3.0, 0.09, 0.45, PALETTE.stone, 0, 0.09, 3.40);
	box(g, 2.5, 0.09, 0.45, PALETTE.stone, 0, 0.135, 3.05);

	// ── 2. Gopuram Gateway Base (Wide open walkthrough arch) ──────────────
	// Located at z = 1.8. Generous 2.4m wide x 2.7m high open archway.
	// Left gateway pier
	box(g, 1.4, 2.7, 2.2, PALETTE.stone, -1.9, 1.43, 1.8);
	// Right gateway pier
	box(g, 1.4, 2.7, 2.2, PALETTE.stone,  1.9, 1.43, 1.8);
	// Carved entrance pilasters with decorative stone mouldings
	cylinder(g, 0.18, 0.20, 2.7, PALETTE.stoneShade, -1.22, 1.43, 2.85, 8);
	cylinder(g, 0.18, 0.20, 2.7, PALETTE.stoneShade,  1.22, 1.43, 2.85, 8);
	box(g, 0.48, 0.18, 0.48, PALETTE.stone, -1.22, 2.85, 2.85);
	box(g, 0.48, 0.18, 0.48, PALETTE.stone,  1.22, 2.85, 2.85);
	// Heavy stone lintel spanning over the doorway
	box(g, 5.4, 0.52, 2.2, PALETTE.stone, 0, 3.0, 1.8);
	// Golden carved Torana archway header
	box(g, 2.6, 0.32, 0.16, PALETTE.gold, 0, 2.82, 2.88);

	// ── Festive Marigold Torana strung across the entrance doorway ────────
	// Alternating bright saffron-orange & golden-yellow marigold flower garland
	const garlandColors = ['#ff6f00', '#ffc107'];
	for (let i = -6; i <= 6; i++) {
		const tx = i * 0.20;
		const sag = Math.cos((i / 6) * (Math.PI / 2)) * 0.14;
		const col = garlandColors[Math.abs(i) % 2];
		sphere(g, 0.075, col, tx, 2.68 - sag, 2.92, 8);
		// Mango leaf between flowers
		if (Math.abs(i) < 6) {
			const leaf = box(g, 0.04, 0.12, 0.02, '#388e3c', tx + 0.10, 2.62 - sag, 2.92);
			leaf.rotation.z = (i % 2 === 0 ? 0.15 : -0.15);
		}
	}

	// ── 3. Tiered Gopuram Tower on top ────────────────────────────────────
	const colors = [
		PALETTE.templeOchre,
		PALETTE.templeRed,
		PALETTE.templeBlue,
		PALETTE.templeGreen,
		PALETTE.templeOchre
	];
	let y = 3.26;
	for (let i = 0; i < colors.length; i++) {
		const w = 4.4 - i * 0.62;
		const d = 2.2 - i * 0.32;
		box(g, w + 0.25, 0.14, d + 0.25, PALETTE.parapet, 0, y + 0.07, 1.8);
		box(g, w, 0.82, d, colors[i], 0, y + 0.55, 1.8);
		// Sculpted deity niches on front and back
		for (let k = -1; k <= 1; k++) {
			box(g, 0.24, 0.46, 0.06, colors[(i + 2) % colors.length], k * w * 0.3, y + 0.55, 1.8 + d / 2 + 0.03);
			box(g, 0.24, 0.46, 0.06, colors[(i + 2) % colors.length], k * w * 0.3, y + 0.55, 1.8 - d / 2 - 0.03);
		}
		y += 0.96;
	}
	// Barrel-vaulted shikhara roof
	const vault = cylinder(g, 0.55, 0.55, 1.9, PALETTE.templeOchre, 0, y + 0.35, 1.8, 12);
	vault.rotation.z = Math.PI / 2;
	// 5 Golden Kalasam spires crowning the shikhara
	for (let k = -2; k <= 2; k++) {
		cylinder(g, 0.02, 0.1, 0.35, PALETTE.gold, k * 0.38, y + 1.05, 1.8, 6);
		sphere(g, 0.08, PALETTE.gold, k * 0.38, y + 0.92, 1.8, 6);
	}

	// ── 4. Inner Mandapa Courtyard Walls & Columns ────────────────────────
	// Side boundary walls
	box(g, 0.32, 2.3, 3.8, PALETTE.stone, -2.55, 1.25, -0.4);
	box(g, 0.32, 2.3, 3.8, PALETTE.stone,  2.55, 1.25, -0.4);
	// Back sanctum wall
	box(g, 5.4, 2.6, 0.4, PALETTE.stone, 0, 1.40, -2.4);

	// Mandapa carved stone pillars on the sides (wide 3.2m central viewing aisle)
	const pillarPositions = [
		{ x: -1.8, z: 0.6 },
		{ x:  1.8, z: 0.6 },
		{ x: -1.8, z: -0.6 },
		{ x:  1.8, z: -0.6 }
	];
	for (const p of pillarPositions) {
		box(g, 0.42, 0.22, 0.42, PALETTE.stone, p.x, 0.22, p.z);
		cylinder(g, 0.14, 0.16, 2.3, PALETTE.stoneShade, p.x, 1.35, p.z, 8);
		box(g, 0.45, 0.16, 0.45, PALETTE.stone, p.x, 2.55, p.z);
	}
	box(g, 0.28, 0.22, 1.6, PALETTE.stone, -1.8, 2.72, 0.0);
	box(g, 0.28, 0.22, 1.6, PALETTE.stone,  1.8, 2.72, 0.0);

	// Hanging brass temple bells on the sides (leaving center 100% open for view)
	for (const bx of [-1.1, 1.1]) {
		cylinder(g, 0.015, 0.015, 0.45, PALETTE.gold, bx, 2.50, 0.6, 6);
		cylinder(g, 0.05, 0.13, 0.18, PALETTE.gold, bx, 2.22, 0.6, 10);
		sphere(g, 0.04, PALETTE.gold, bx, 2.12, 0.6, 6);
	}

	// Traditional white & terracotta Rangoli / Kolam at entrance threshold
	box(g, 1.6, 0.01, 1.6, '#f5efe6', 0, 0.165, 1.0);
	box(g, 1.0, 0.012, 1.0, '#c45236', 0, 0.167, 1.0);

	// ── 5. Elevated Garbhagriha Altar (Directly visible from entrance!) ───
	// Placed at z = -0.8 for a clear, unobstructed sightline through the door!
	// Raised altar platform
	box(g, 3.4, 0.46, 2.2, PALETTE.stoneShade, 0, 0.31, -0.8);
	// Altar approach steps
	box(g, 2.2, 0.18, 0.45, PALETTE.stone, 0, 0.17, 0.45);
	// Circular golden lotus dais (Padmasana) atop altar
	cylinder(g, 1.05, 1.20, 0.16, PALETTE.gold, 0, 0.62, -0.8, 16);

	// Sacred backdrop Prabhavali (golden-red halo arch) behind the deity
	box(g, 2.4, 2.2, 0.08, PALETTE.templeRed, 0, 1.70, -1.85);
	cylinder(g, 0.05, 0.05, 2.2, PALETTE.gold, -1.15, 1.70, -1.80, 8);
	cylinder(g, 0.05, 0.05, 2.2, PALETTE.gold,  1.15, 1.70, -1.80, 8);
	box(g, 2.45, 0.14, 0.14, PALETTE.gold, 0, 2.80, -1.80);

	// Marigold garland festoon strung across the Prabhavali arch
	for (let i = -5; i <= 5; i++) {
		sphere(g, 0.075, garlandColors[Math.abs(i) % 2], i * 0.22, 2.80 - Math.abs(i) * 0.03, -1.74, 8);
	}

	// ── 6. LORD GANESHA IDOL (GANPATI) - Elevated, Large & Resplendent ────
	// Centered on lotus dais at x = 0, y = 0.70, z = -0.80
	// Seated posture / folded legs
	box(g, 0.92, 0.28, 0.58, PALETTE.gold, 0, 0.84, -0.80);
	// Plump, gentle belly
	sphere(g, 0.36, PALETTE.gold, 0, 1.18, -0.76, 14);
	// Sacred thread (yajnopavita) in white across chest
	{
		const thread = cylinder(g, 0.018, 0.018, 0.54, '#ffffff', -0.05, 1.22, -0.60, 6);
		thread.rotation.z = -0.55;
	}

	// Four arms of Lord Ganesha:
	// Upper-right holding axe / ankusha
	cylinder(g, 0.045, 0.045, 0.32, PALETTE.gold, 0.44, 1.36, -0.76, 6);
	sphere(g, 0.07, PALETTE.gold, 0.46, 1.54, -0.76, 6);
	// Upper-left holding pasha (noose)
	cylinder(g, 0.045, 0.045, 0.32, PALETTE.gold, -0.44, 1.36, -0.76, 6);
	sphere(g, 0.07, PALETTE.gold, -0.46, 1.54, -0.76, 6);
	// Lower-left holding bowl of sweet golden modaks
	sphere(g, 0.11, '#f5efe6', -0.32, 1.10, -0.58, 8);
	sphere(g, 0.055, '#ffd700', -0.32, 1.18, -0.58, 6); // sweet golden modak
	// Lower-right hand in blessing gesture (Abhaya mudra)
	box(g, 0.10, 0.16, 0.07, PALETTE.gold, 0.32, 1.14, -0.56);

	// Noble elephant head
	sphere(g, 0.34, PALETTE.gold, 0, 1.62, -0.74, 14);

	// Fanned ears on left and right
	for (const sx of [-1, 1] as const) {
		const ear = cylinder(g, 0.22, 0.22, 0.04, PALETTE.gold, sx * 0.38, 1.64, -0.74, 8);
		ear.rotation.z = Math.PI / 2;
	}

	// Curved elephant trunk gracefully curving left towards the sweet modak
	cylinder(g, 0.11, 0.085, 0.30, PALETTE.gold, 0, 1.44, -0.54, 8);
	{
		const trunkCurved = cylinder(g, 0.075, 0.05, 0.30, PALETTE.gold, -0.14, 1.22, -0.50, 8);
		trunkCurved.rotation.z = 0.85;
	}
	sphere(g, 0.055, '#ffd700', -0.24, 1.12, -0.50, 6); // trunk tip holding modak

	// Single visible sacred right tusk (Ekadanta)
	{
		const tusk = cylinder(g, 0.018, 0.035, 0.15, '#ffffff', 0.13, 1.46, -0.56, 6);
		tusk.rotation.z = -0.42;
	}

	// Ornate tall golden Mukut (Crown) with Ruby Gem
	cylinder(g, 0.22, 0.28, 0.30, PALETTE.gold, 0, 1.92, -0.74, 8);
	cylinder(g, 0.09, 0.18, 0.30, PALETTE.gold, 0, 2.20, -0.74, 8);
	sphere(g, 0.07, '#d9534f', 0, 2.40, -0.74, 6); // glowing red jewel finial

	// ── 7. FRESH SAFFRON-ORANGE & GOLDEN-YELLOW MARIGOLD GARLANDS ─────────
	// Plump, vibrant flower blossoms draped prominently around Lord Ganesha
	// Outer loop draped across shoulders and around belly
	for (let i = 0; i <= 10; i++) {
		const t = (i / 10) * Math.PI; // 0 to PI
		const gx = Math.cos(t) * 0.36;
		const gy = 1.58 - Math.sin(t) * 0.44;
		const gz = -0.56 - Math.sin(t) * 0.10;
		const col = garlandColors[i % 2];
		sphere(g, 0.08, col, gx, gy, gz, 8);
	}
	// Inner loop around the neck
	for (let i = 0; i <= 6; i++) {
		const t = (i / 6) * Math.PI;
		const gx = Math.cos(t) * 0.22;
		const gy = 1.56 - Math.sin(t) * 0.24;
		const gz = -0.54;
		const col = garlandColors[(i + 1) % 2];
		sphere(g, 0.07, col, gx, gy, gz, 8);
	}

	// ── 8. Flanking Brass Oil Lamps (Kuthuvilakku) ─────────────────────────
	for (const lx of [-1.15, 1.15]) {
		cylinder(g, 0.15, 0.19, 0.14, PALETTE.gold, lx, 0.62, -0.55, 8);
		cylinder(g, 0.04, 0.04, 0.75, PALETTE.gold, lx, 1.04, -0.55, 8);
		cylinder(g, 0.16, 0.09, 0.12, PALETTE.gold, lx, 1.45, -0.55, 8);
		// Glowing warm orange & golden flame
		sphere(g, 0.065, '#ff7700', lx, 1.56, -0.55, 8);
		sphere(g, 0.038, '#ffff88', lx, 1.58, -0.55, 6);
	}

	// ── 9. Puja Offering Thali (Plate) ────────────────────────────────────
	cylinder(g, 0.28, 0.28, 0.03, PALETTE.gold, 0, 0.58, -0.20, 12);
	// Coconut offering
	sphere(g, 0.07, '#5c3a21', -0.12, 0.63, -0.20, 8);
	sphere(g, 0.05, '#fffaf0', -0.12, 0.64, -0.20, 6);
	// Modak sweets on plate
	sphere(g, 0.04, '#fff1cc', 0.07, 0.62, -0.23, 6);
	sphere(g, 0.04, '#fff1cc', 0.12, 0.62, -0.16, 6);
	sphere(g, 0.04, '#ffd700', 0.03, 0.62, -0.14, 6);
	// Red hibiscus flower offering
	blob(g, 0.06, '#e53935', 0, 0.62, -0.28);

	// ── 10. THE SACRED OBJECT: DIVINE VEENA (CARNATIC MUSICAL INSTRUMENT) ─
	// Resting proudly on a ceremonial red-and-gold stand right before the altar
	// Ceremonial cushion stand
	box(g, 1.3, 0.10, 0.44, PALETTE.templeRed, 0, 0.36, 0.40);
	box(g, 1.36, 0.04, 0.50, PALETTE.gold, 0, 0.33, 0.40);

	// Veena main resonator gourd (Kudam) on right
	sphere(g, 0.22, '#7a3818', 0.38, 0.52, 0.40, 14);
	cylinder(g, 0.16, 0.16, 0.04, '#fff9ea', 0.38, 0.64, 0.40, 10);
	// Veena long neck (Dandi)
	const dandi = cylinder(g, 0.045, 0.045, 0.82, '#5c2a12', -0.05, 0.54, 0.40, 8);
	dandi.rotation.z = Math.PI / 2;
	// Golden frets along the neck
	for (let f = 0; f < 5; f++) {
		box(g, 0.02, 0.025, 0.07, PALETTE.gold, -0.32 + f * 0.12, 0.58, 0.40);
	}
	// Secondary resonator gourd on left
	sphere(g, 0.12, '#7a3818', -0.42, 0.44, 0.40, 10);
	// Golden carved Yali dragon head scroll at pegbox
	sphere(g, 0.08, PALETTE.gold, -0.52, 0.56, 0.40, 8);
	cylinder(g, 0.025, 0.045, 0.14, PALETTE.gold, -0.55, 0.64, 0.40, 6);

	// Golden sacred quest sparkle aura around the Veena
	const glowRing = cylinder(g, 0.46, 0.46, 0.02, PALETTE.gold, 0, 0.40, 0.40, 16);
	glowRing.scale.set(1.4, 1, 0.6);

	return { group: g, width: 5.6, depth: 7.0, hollowFootprint: true };
}

/** Helper to add a tourist NPC figure taking a photo with a camera. */
function addTourist(parent: THREE.Object3D, x: number, z: number, facingAngle = 0) {
	const t = new THREE.Group();
	t.position.set(x, 0, z);
	t.rotation.y = facingAngle;

	// Body & legs
	cylinder(t, 0.16, 0.18, 0.65, '#2563eb', 0, 0.32, 0, 8); // pants
	cylinder(t, 0.20, 0.22, 0.70, '#f97316', 0, 0.95, 0, 8); // shirt
	// Head
	sphere(t, 0.16, '#c68642', 0, 1.45, 0, 8);
	// Sunhat
	cylinder(t, 0.32, 0.32, 0.04, '#e2d9c8', 0, 1.58, 0, 10);
	cylinder(t, 0.18, 0.18, 0.12, '#e2d9c8', 0, 1.66, 0, 10);

	// Arms raised holding camera
	const armL = cylinder(t, 0.05, 0.05, 0.35, '#f97316', -0.18, 1.25, 0.15, 6);
	armL.rotation.x = 1.1;
	armL.rotation.z = -0.3;
	const armR = cylinder(t, 0.05, 0.05, 0.35, '#f97316', 0.18, 1.25, 0.15, 6);
	armR.rotation.x = 1.1;
	armR.rotation.z = 0.3;

	// Camera with lens & flash
	box(t, 0.18, 0.12, 0.10, '#1f2937', 0, 1.38, 0.28);
	cylinder(t, 0.04, 0.04, 0.08, '#4b5563', 0, 1.38, 0.35, 8); // lens
	sphere(t, 0.025, '#60a5fa', 0.06, 1.42, 0.33, 6); // flash bulb

	parent.add(t);
	return t;
}

/** 🏨 Ramesh Grand Hotel & Tiffin Centre — Home of Chef Ramesh */
export function createHotel(rand: () => number): Building {
	const g = new THREE.Group();
	const width = 7.6;
	const depth = 5.8;

	// Ground floor: Restaurant & Tiffin Centre
	box(g, width, 2.7, depth, '#f5efe6', 0, 1.35, 0);
	// Wide glazed storefront windows
	box(g, width * 0.75, 1.8, 0.08, PALETTE.windowLit, 0, 1.4, depth / 2 + 0.04);
	// Red and yellow striped awning over the restaurant
	for (let i = 0; i < 7; i++) {
		const stripeColor = i % 2 === 0 ? '#dc2626' : '#facc15';
		const stripe = box(g, width / 7 + 0.02, 0.06, 1.2, stripeColor, -width / 2 + (i + 0.5) * (width / 7), 2.75, depth / 2 + 0.55);
		stripe.rotation.x = 0.28;
	}
	// Signboard: "RAMESH GRAND HOTEL & TIFFIN"
	box(g, width * 0.82, 0.45, 0.14, '#991b1b', 0, 2.95, depth / 2 + 0.1);
	box(g, width * 0.78, 0.32, 0.16, '#fef08a', 0, 2.95, depth / 2 + 0.12);

	// Chai & Tiffin Service Counter in front
	box(g, 1.6, 0.9, 0.7, '#78350f', -width * 0.28, 0.45, depth / 2 + 0.4);
	cylinder(g, 0.16, 0.18, 0.45, '#d1d5db', -width * 0.28, 1.05, depth / 2 + 0.4, 10); // samovar urn
	sphere(g, 0.05, '#f59e0b', -width * 0.28, 1.32, depth / 2 + 0.4, 6); // brass finial

	// 1st and 2nd Floors: Hotel Guest Rooms
	for (let f = 1; f <= 2; f++) {
		const y0 = 2.7 + (f - 1) * 2.4;
		box(g, width, 2.4, depth, f === 1 ? '#fde047' : '#facc15', 0, y0 + 1.2, 0);
		// Hotel room windows with balconies
		for (let b = -1; b <= 1; b++) {
			box(g, 1.0, 1.3, 0.08, PALETTE.windowLit, b * 2.2, y0 + 1.3, depth / 2 + 0.04);
			// Balcony railing
			box(g, 1.4, 0.5, 0.4, '#374151', b * 2.2, y0 + 0.35, depth / 2 + 0.25);
		}
	}

	// Rooftop with neon sign
	const top = 2.7 + 2 * 2.4;
	parapet(g, width, depth, top, '#b45309');
	// Neon rooftop sign structure "HOTEL"
	box(g, 2.8, 0.8, 0.15, '#1e293b', 0, top + 0.65, depth / 2 - 0.4);
	box(g, 2.6, 0.6, 0.18, '#ef4444', 0, top + 0.65, depth / 2 - 0.38);

	return { group: g, width: 7.8, depth: 6.2 };
}

/** 🏛️ Karnataka Rajya Vijnana Mandir (Science Museum) — Home of the Titanium Strut */
export function createMuseum(): Building {
	const g = new THREE.Group();
	const width = 9.2;
	const depth = 6.8;

	// Grand plinth steps
	for (let s = 0; s < 4; s++) {
		box(g, width + 0.8 - s * 0.3, 0.15, depth + 1.2 - s * 0.3, PALETTE.stoneShade, 0, 0.075 + s * 0.15, 0.3 - s * 0.15);
	}

	const baseY = 0.6;
	// Main museum hall building
	box(g, width, 3.6, depth, '#f8fafc', 0, baseY + 1.8, -0.4);

	// Classical Neoclassical Portico: 6 grand fluted columns
	for (let i = 0; i < 6; i++) {
		const cx = (i - 2.5) * 1.55;
		cylinder(g, 0.22, 0.26, 3.4, '#e2e8f0', cx, baseY + 1.7, depth / 2 - 0.2, 12);
		// Corinthian-style capital & base
		box(g, 0.6, 0.18, 0.6, '#cbd5e1', cx, baseY + 0.1, depth / 2 - 0.2);
		box(g, 0.6, 0.20, 0.6, '#cbd5e1', cx, baseY + 3.4, depth / 2 - 0.2);
	}

	// Triangular Pediment over entrance
	box(g, width + 0.4, 0.4, 1.4, '#e2e8f0', 0, baseY + 3.7, depth / 2 - 0.2);
	// Signboard: "SCIENCE MUSEUM"
	box(g, 5.0, 0.35, 0.1, '#1e3a8a', 0, baseY + 3.4, depth / 2 + 0.45);
	box(g, 4.8, 0.25, 0.12, '#f8fafc', 0, baseY + 3.4, depth / 2 + 0.46);

	// Glass showcase in the entrance hall exhibiting the QUANTUM TITANIUM STRUT!
	box(g, 1.2, 0.8, 0.8, '#0f172a', 0, baseY + 0.4, depth / 2 - 1.6);
	box(g, 1.1, 0.9, 0.7, '#38bdf8', 0, baseY + 1.25, depth / 2 - 1.6); // glass case
	// The Glowing Quantum Titanium Strut artifact
	cylinder(g, 0.06, 0.08, 0.65, '#22d3ee', 0, baseY + 1.25, depth / 2 - 1.6, 8);
	sphere(g, 0.12, '#06b6d4', 0, baseY + 1.6, depth / 2 - 1.6, 8);

	// Tourists outside taking photos of the grand museum!
	addTourist(g, -3.2, depth / 2 + 0.8, 0.35);
	addTourist(g,  3.2, depth / 2 + 0.8, -0.35);

	return { group: g, width: 9.6, depth: 7.6, hollowFootprint: true };
}

/** 🏰 Bangalore Palace (Tudor-Gothic Icon) with battlements & photo-taking tourists */
export function createBangalorePalace(): Building {
	const g = new THREE.Group();
	const width = 11.0;
	const depth = 7.2;

	// Stone plinth
	box(g, width + 0.4, 0.3, depth + 0.4, PALETTE.stoneShade, 0, 0.15, 0);

	// Central palace castle block
	box(g, width - 2.4, 3.8, depth - 1.2, '#d4c5a9', 0, 2.05, 0);

	// 4 Corner crenellated fortified towers (Tudor turrets)
	const cornerXs = [-width / 2 + 1.0, width / 2 - 1.0];
	const cornerZs = [-depth / 2 + 1.0, depth / 2 - 1.0];
	for (const cx of cornerXs) {
		for (const cz of cornerZs) {
			cylinder(g, 0.95, 1.05, 5.2, '#c8b698', cx, 2.75, cz, 12);
			// Crenellations (battlements) atop tower
			cylinder(g, 1.15, 0.95, 0.4, '#a89476', cx, 5.4, cz, 12);
			for (let b = 0; b < 6; b++) {
				const ba = (b / 6) * Math.PI * 2;
				box(g, 0.25, 0.35, 0.25, '#8c775a', cx + Math.cos(ba) * 0.95, 5.7, cz + Math.sin(ba) * 0.95);
			}
		}
	}

	// Main Tudor arched gateway portcullis
	box(g, 2.4, 3.0, 0.4, '#5c4830', 0, 1.65, depth / 2 - 0.5);
	box(g, 1.8, 2.4, 0.2, '#1f160e', 0, 1.35, depth / 2 - 0.35);
	// Ornate battlements along the roofline
	for (let i = -7; i <= 7; i++) {
		if (i % 2 === 0) box(g, 0.4, 0.4, 0.3, '#a89476', i * 0.55, 4.15, depth / 2 - 0.6);
	}

	// Tourists in front of Bangalore Palace taking photos!
	addTourist(g, -2.5, depth / 2 + 1.2, 0.2);
	addTourist(g,  0.0, depth / 2 + 1.8, 0.0);
	addTourist(g,  2.8, depth / 2 + 1.3, -0.25);

	return { group: g, width: 11.4, depth: 7.8 };
}

/** 🌺 Lalbagh Botanical Garden Glass House (Victorian Iron & Glass Wonder, 1889) */
export function createGlassHouse(): Building {
	const g = new THREE.Group();
	const width = 9.8;
	const depth = 7.0;

	// Stone basement foundation
	box(g, width + 0.4, 0.35, depth + 0.4, '#e2e8f0', 0, 0.175, 0);

	// Victorian iron & glass greenhouse hall
	box(g, width, 2.2, depth, '#bae6fd', 0, 1.45, 0);
	// Dark green iron structural ribs
	for (let x = -4; x <= 4; x++) {
		box(g, 0.08, 2.25, depth + 0.04, '#14532d', x * 1.1, 1.45, 0);
	}

	// Majestic Victorian Center Glass Dome
	cylinder(g, 1.8, 2.0, 1.2, '#14532d', 0, 3.15, 0, 16);
	const dome = sphere(g, 1.8, '#7dd3fc', 0, 3.8, 0, 16);
	dome.scale.set(1, 0.75, 1);
	// Spire finial
	cylinder(g, 0.02, 0.1, 0.8, PALETTE.gold, 0, 5.4, 0, 8);
	sphere(g, 0.12, PALETTE.gold, 0, 5.85, 0, 8);

	// Classical Victorian arched entrance portico with "1889" date plaque
	box(g, 2.8, 2.6, 1.0, '#f8fafc', 0, 1.5, depth / 2 + 0.5);
	box(g, 1.6, 0.3, 0.1, '#1e293b', 0, 2.6, depth / 2 + 1.02); // 1889 plaque

	// Colorful flower beds flanking the entrance
	for (const fx of [-3.2, 3.2]) {
		box(g, 2.4, 0.25, 1.2, '#78350f', fx, 0.25, depth / 2 + 0.8);
		// Flowers
		for (let k = 0; k < 6; k++) {
			const col = ['#e11d48', '#f59e0b', '#8b5cf6', '#ec4899'][k % 4];
			sphere(g, 0.12, col, fx - 0.8 + (k % 3) * 0.8, 0.45, depth / 2 + 0.6 + Math.floor(k / 3) * 0.4, 6);
		}
	}

	// Tourists taking photos and admiring the Glass House
	addTourist(g, -1.8, depth / 2 + 1.6, 0.15);
	addTourist(g,  1.8, depth / 2 + 1.6, -0.15);

	return { group: g, width: 10.2, depth: 7.6 };
}

