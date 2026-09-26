import * as THREE from 'three';
import { PALETTE } from '../constants';
import { box, cylinder, pick, sphere } from './util';

// Vehicles face +Z, origin at road level. Kept as separate objects (not merged) because they move.

export type VehicleKind = 'auto' | 'scooter' | 'car';

/** Half-extents of each vehicle's footprint (m), used by traffic avoidance and collisions. */
export const VEHICLE_SIZE: Record<VehicleKind, { halfLength: number; halfWidth: number }> = {
	auto: { halfLength: 1.3, halfWidth: 0.65 },
	scooter: { halfLength: 0.7, halfWidth: 0.3 },
	car: { halfLength: 1.8, halfWidth: 0.72 }
};

function wheel(g: THREE.Object3D, r: number, w: number, x: number, z: number) {
	const m = cylinder(g, r, r, w, PALETTE.tyre, x, r, z, 10);
	m.rotation.z = Math.PI / 2;
}

function rider(g: THREE.Object3D, shirt: string, y: number, z: number, helmet?: string) {
	// Body
	box(g, 0.34, 0.45, 0.22, shirt, 0, y + 0.22, z);
	
	// Left arm (reaching forward)
	const armL = cylinder(g, 0.045, 0.04, 0.4, shirt, -0.2, y + 0.3, z + 0.15, 6);
	armL.rotation.x = Math.PI / 2 + 0.15; // Point forward, slightly down
	armL.rotation.z = -0.1; // Angle slightly inwards
	// Right arm
	const armR = cylinder(g, 0.045, 0.04, 0.4, shirt, 0.2, y + 0.3, z + 0.15, 6);
	armR.rotation.x = Math.PI / 2 + 0.15;
	armR.rotation.z = 0.1;

	// Head
	sphere(g, 0.13, PALETTE.skin, 0, y + 0.58, z, 8);
	
	// Helmet or Hair
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
	sphere(g, 0.08, PALETTE.headlight, 0, 1.2, 1.3, 8);
	wheel(g, 0.24, 0.16, 0, 1.0);
	wheel(g, 0.24, 0.16, -0.6, -0.65);
	wheel(g, 0.24, 0.16, 0.6, -0.65);
	rider(g, '#b59b6a', 0.75, 0.55);
	return g;
}

/** Small hatchback — the other half of every Bengaluru traffic jam. */
export function createCar(rand: () => number): THREE.Group {
	const g = new THREE.Group();
	const paint = pick(rand, ['#f2f2f2', '#c0392b', '#b8bec2', '#3d6fb4', '#e8b93a']);
	box(g, 1.4, 0.55, 3.4, paint, 0, 0.6, 0);
	box(g, 1.3, 0.55, 1.9, paint, 0, 1.15, -0.25);
	box(g, 1.22, 0.42, 0.04, '#bcd6db', 0, 1.15, 0.72).rotation.x = -0.35;
	box(g, 1.22, 0.4, 0.04, '#bcd6db', 0, 1.15, -1.21).rotation.x = 0.3;
	for (const x of [-0.66, 0.66]) box(g, 0.04, 0.36, 1.5, '#bcd6db', x, 1.17, -0.25);
	for (const x of [-0.5, 0.5]) {
		sphere(g, 0.08, PALETTE.headlight, x, 0.72, 1.7, 8);
		box(g, 0.2, 0.1, 0.04, PALETTE.tailLight, x, 0.75, -1.71);
	}
	box(g, 1.44, 0.12, 0.12, PALETTE.kerbBlack, 0, 0.38, 1.68);
	box(g, 1.44, 0.12, 0.12, PALETTE.kerbBlack, 0, 0.38, -1.68);
	for (const x of [-0.66, 0.66]) for (const z of [1.1, -1.1]) wheel(g, 0.28, 0.2, x, z);
	return g;
}

/**
 * Ola S1 Pro — futuristic electric scooter with a flat floor board, smooth
 * sweeping body, LED light bar, and clean minimal design language.
 */
function createOlaS1(rand: () => number): THREE.Group {
	const g = new THREE.Group();
	const body = pick(rand, ['#2ecc71', '#3498db', '#e74c3c', '#f5f5f5', '#1a1a2e']);
	// Flat floor board — signature Ola design
	box(g, 0.38, 0.08, 0.9, PALETTE.kerbBlack, 0, 0.38, 0.0);
	// Smooth lower body — wider, flatter than conventional scooters
	box(g, 0.36, 0.32, 1.05, body, 0, 0.56, 0.0);
	// Raised front apron — tall, smooth, slightly wider
	box(g, 0.38, 0.55, 0.22, body, 0, 0.78, 0.52);
	// Sloping tail — tapers down gracefully
	const tail = box(g, 0.34, 0.22, 0.28, body, 0, 0.62, -0.52);
	tail.rotation.x = 0.25;
	// LED light bar across the front (Ola's horizontal strip)
	box(g, 0.32, 0.04, 0.02, PALETTE.headlight, 0, 1.0, 0.63);
	// Tail light strip
	box(g, 0.26, 0.03, 0.01, PALETTE.tailLight, 0, 0.68, -0.66);
	// Slim handlebar — minimalist
	box(g, 0.55, 0.035, 0.035, PALETTE.kerbBlack, 0, 1.1, 0.55);
	// Digital dash panel
	box(g, 0.12, 0.08, 0.04, '#222', 0, 1.05, 0.5);
	// Alloy wheels — slightly larger for EV look
	wheel(g, 0.22, 0.1, 0, 0.52);
	wheel(g, 0.22, 0.1, 0, -0.48);
	// Seat — long, flat, single-piece
	box(g, 0.3, 0.08, 0.55, '#1a1a1a', 0, 0.78, -0.12);
	rider(
		g,
		pick(rand, ['#5b8bd0', '#e8e2d0', '#2d3436', '#6a8f3a']),
		0.82,
		-0.18,
		pick(rand, ['#e0e0e0', '#2ecc71', '#2f2f2f'])
	);
	return g;
}

/**
 * Ather 450X — sporty, angular electric scooter with aggressive lines,
 * sharp front nose, pronounced side panels, and muscular stance.
 */
function createAther450(rand: () => number): THREE.Group {
	const g = new THREE.Group();
	const body = pick(rand, ['#2c3e50', '#f5f5f5', '#27ae60', '#95a5a6', '#1abc9c']);
	// Lower body — angular, aggressive stance
	box(g, 0.34, 0.35, 1.0, body, 0, 0.52, 0.0);
	// Angular front apron — taller, sharper nose (Ather's aggressive front)
	const front = box(g, 0.36, 0.6, 0.2, body, 0, 0.8, 0.52);
	front.rotation.x = -0.1; // slight forward lean
	// Side panels — pronounced ridges
	box(g, 0.4, 0.12, 0.5, body, 0, 0.55, 0.1);
	// Rear cowl — angular, sporty
	const rear = box(g, 0.3, 0.28, 0.3, body, 0, 0.6, -0.5);
	rear.rotation.x = 0.3;
	// Sharp headlight — boomerang style
	box(g, 0.24, 0.06, 0.02, PALETTE.headlight, 0, 1.02, 0.63);
	sphere(g, 0.03, PALETTE.headlight, -0.12, 0.98, 0.63, 6);
	sphere(g, 0.03, PALETTE.headlight, 0.12, 0.98, 0.63, 6);
	// Tail light — thin LED strip
	box(g, 0.2, 0.025, 0.01, PALETTE.tailLight, 0, 0.7, -0.65);
	// Handlebar — sportier, wider
	box(g, 0.58, 0.04, 0.04, PALETTE.kerbBlack, 0, 1.12, 0.54);
	// Touch-screen dash
	box(g, 0.1, 0.1, 0.03, '#333', 0, 1.06, 0.5);
	// Floor board
	box(g, 0.35, 0.06, 0.4, PALETTE.kerbBlack, 0, 0.38, 0.05);
	// Wheels — sporty alloys
	wheel(g, 0.21, 0.1, 0, 0.52);
	wheel(g, 0.21, 0.1, 0, -0.46);
	// Seat — split-style
	box(g, 0.28, 0.07, 0.3, '#1a1a1a', 0, 0.76, -0.05);
	box(g, 0.26, 0.06, 0.22, '#222', 0, 0.74, -0.32);
	rider(
		g,
		pick(rand, ['#2d3436', '#e8e2d0', '#34495e', '#636e72']),
		0.82,
		-0.18,
		pick(rand, ['#2c3e50', '#1abc9c', '#e0e0e0'])
	);
	return g;
}

/**
 * Honda Activa — the classic Indian scooter with its rounded, conventional
 * body, chrome accents, tubular steel frame feel, and wide mirrors.
 */
function createActiva(rand: () => number): THREE.Group {
	const g = new THREE.Group();
	const body = pick(rand, ['#c0392b', '#2c3e50', '#7f8c8d', '#ecf0f1', '#f1c40f', '#2980b9']);
	// Body — rounded, conventional, wider midsection
	box(g, 0.36, 0.38, 1.1, body, 0, 0.52, 0.0);
	// Round front — classic Honda curves
	sphere(g, 0.2, body, 0, 0.6, 0.55, 8);
	// Front apron — conventional upright
	box(g, 0.36, 0.48, 0.2, body, 0, 0.72, 0.48);
	// Chrome front strip (Honda badge area)
	box(g, 0.12, 0.06, 0.02, PALETTE.metal, 0, 0.86, 0.58);
	// Round headlight — classic Activa circular lamp
	sphere(g, 0.06, PALETTE.headlight, 0, 0.92, 0.59, 8);
	cylinder(g, 0.065, 0.065, 0.02, PALETTE.metal, 0, 0.92, 0.6, 10);
	// Tail section — rounded hump
	const tail = box(g, 0.34, 0.26, 0.3, body, 0, 0.6, -0.55);
	tail.rotation.x = 0.2;
	// Round tail light
	sphere(g, 0.04, PALETTE.tailLight, 0, 0.65, -0.68, 6);
	// Chrome exhaust guard — characteristic Activa detail
	cylinder(g, 0.04, 0.035, 0.35, PALETTE.metal, 0.18, 0.32, -0.35, 8);
	// Handlebar — chrome, conventional
	box(g, 0.6, 0.04, 0.04, PALETTE.metal, 0, 1.06, 0.52);
	// Mirrors — round on stalks
	for (const x of [-0.34, 0.34]) {
		box(g, 0.14, 0.03, 0.02, PALETTE.kerbBlack, x, 1.08, 0.56);
		sphere(g, 0.025, PALETTE.metal, x < 0 ? x - 0.07 : x + 0.07, 1.09, 0.56, 6);
	}
	// Floor board
	box(g, 0.38, 0.06, 0.45, PALETTE.kerbBlack, 0, 0.36, 0.0);
	// Wheels — steel, conventional
	wheel(g, 0.2, 0.12, 0, 0.5);
	wheel(g, 0.2, 0.12, 0, -0.45);
	// Seat — broad, cushioned, single-piece
	box(g, 0.32, 0.1, 0.55, '#2c2c2c', 0, 0.78, -0.1);
	rider(
		g,
		pick(rand, ['#5b8bd0', '#e8e2d0', '#c0392b', '#6a8f3a']),
		0.84,
		-0.18,
		pick(rand, ['#e0e0e0', '#c0392b', '#2f2f2f'])
	);
	return g;
}

/**
 * TVS Scooty Pep — compact, slim commuter scooter. Smaller wheels, narrow
 * body, lightweight frame, and petite proportions aimed at easy city riding.
 */
function createScootypep(rand: () => number): THREE.Group {
	const g = new THREE.Group();
	const body = pick(rand, ['#e91e63', '#9b59b6', '#ff9800', '#00bcd4', '#f5f5f5', '#e74c3c']);
	// Body — noticeably slimmer and shorter than Activa
	box(g, 0.28, 0.32, 0.9, body, 0, 0.44, 0.0);
	// Front apron — slim, upright, petite
	box(g, 0.3, 0.42, 0.16, body, 0, 0.62, 0.42);
	// Small round headlight
	sphere(g, 0.045, PALETTE.headlight, 0, 0.82, 0.51, 6);
	// Turn indicators — small bumps
	sphere(g, 0.02, '#f39c12', -0.14, 0.78, 0.5, 4);
	sphere(g, 0.02, '#f39c12', 0.14, 0.78, 0.5, 4);
	// Slim tail — very compact
	const tail = box(g, 0.26, 0.18, 0.22, body, 0, 0.5, -0.46);
	tail.rotation.x = 0.3;
	// Small tail light
	box(g, 0.1, 0.03, 0.01, PALETTE.tailLight, 0, 0.54, -0.56);
	// Narrow handlebar
	box(g, 0.48, 0.03, 0.03, PALETTE.kerbBlack, 0, 0.96, 0.45);
	// Small mirrors
	for (const x of [-0.28, 0.28]) {
		box(g, 0.1, 0.02, 0.02, PALETTE.kerbBlack, x, 0.97, 0.48);
	}
	// Narrow floor board
	box(g, 0.3, 0.05, 0.35, PALETTE.kerbBlack, 0, 0.3, 0.0);
	// Smaller wheels — Scooty Pep has smaller 10" wheels
	wheel(g, 0.17, 0.08, 0, 0.42);
	wheel(g, 0.17, 0.08, 0, -0.38);
	// Slim exhaust
	cylinder(g, 0.025, 0.02, 0.25, PALETTE.kerbBlack, 0.14, 0.26, -0.28, 6);
	// Seat — narrow, short
	box(g, 0.26, 0.07, 0.42, '#2c2c2c', 0, 0.66, -0.1);
	rider(
		g,
		pick(rand, ['#e8e2d0', '#ff6f61', '#5b8bd0', '#a29bfe']),
		0.7,
		-0.14,
		pick(rand, ['#e0e0e0', '#e91e63', '#2f2f2f'])
	);
	return g;
}

/** Randomly picks one of the four scooter styles. */
export function createScooter(rand: () => number): THREE.Group {
	const creators = [createOlaS1, createAther450, createActiva, createScootypep];
	return pick(rand, creators)(rand);
}
