import * as THREE from 'three';
import { box, cylinder, sphere } from './util';
import { PALETTE } from '../constants';

export interface KiranaStore {
	group: THREE.Group;
	width: number;
	depth: number;
	interactionPos: THREE.Vector3;
}

/**
 * Creates an authentic Bengaluru "HOPCOMS" vegetable & neighborhood Kirana provision store
 * featuring vegetable crates (tomatoes, carrots, brinjals), hanging bananas, hessian rice sacks,
 * weighing balance scale, UPI soundbox, chalkboard rates, and friendly shopkeeper Murthy Uncle.
 */
export function createKiranaStore(): KiranaStore {
	const root = new THREE.Group();
	const W = 4.6;
	const D = 3.6;
	const H = 2.8;

	// ── 1. Store Building Shell ─────────────────────────────────────
	// Back & side walls (warm buttercup yellow typical of south Indian storefronts)
	const wallCol = '#fef08a';
	const baseCol = '#b45309';

	// Floor slab (terrazzo / tiled flooring)
	box(root, W + 0.4, 0.15, D + 0.6, '#e2e8f0', 0, 0.075, 0.1);

	// Back wall
	box(root, W, H, 0.22, wallCol, 0, H / 2, -D / 2);
	// Left wall
	box(root, 0.22, H, D, wallCol, -W / 2 + 0.11, H / 2, 0);
	// Right wall
	box(root, 0.22, H, D, wallCol, W / 2 - 0.11, H / 2, 0);
	// Roof slab
	box(root, W + 0.4, 0.2, D + 0.4, '#dc2626', 0, H + 0.1, 0);

	// Inner storage shelves on back wall stacked with provisions & jars
	for (let s = 0; s < 3; s++) {
		const sy = 1.0 + s * 0.55;
		box(root, W - 0.8, 0.05, 0.35, '#92400e', 0, sy, -D / 2 + 0.3);
		// Colorful provision jars / tins
		for (let j = 0; j < 8; j++) {
			const jx = -1.6 + j * 0.45;
			cylinder(root, 0.09, 0.09, 0.24, j % 2 ? '#f59e0b' : '#38bdf8', jx, sy + 0.14, -D / 2 + 0.3, 6);
		}
	}

	// ── 2. Striped Awning & HOPCOMS Signboard ───────────────────────
	// Front overhang awning (Green and White stripes - signature HOPCOMS Bengaluru)
	const awningGroup = new THREE.Group();
	awningGroup.position.set(0, H - 0.1, D / 2 + 0.6);
	awningGroup.rotation.x = 0.35; // slopes down toward street
	root.add(awningGroup);

	const stripes = 8;
	const stripeW = (W + 0.8) / stripes;
	for (let i = 0; i < stripes; i++) {
		const col = i % 2 === 0 ? '#15803d' : '#f8fafc'; // vibrant green & white
		box(awningGroup, stripeW - 0.02, 0.04, 1.4, col, -W / 2 - 0.4 + (i + 0.5) * stripeW, 0, 0);
	}
	// Scalloped frill at front edge of awning
	for (let i = 0; i < stripes; i++) {
		const col = i % 2 === 0 ? '#15803d' : '#f8fafc';
		box(awningGroup, stripeW - 0.02, 0.15, 0.02, col, -W / 2 - 0.4 + (i + 0.5) * stripeW, -0.08, 0.7);
	}

	// Signboard above awning: "HOPCOMS / ನಮ್ಮ ತರಕಾರಿ ಅಂಗಡಿ"
	const signBg = box(root, W - 0.4, 0.55, 0.08, '#15803d', 0, H + 0.35, D / 2 + 0.05);
	// Yellow border & text placeholder blocks
	box(root, W - 0.5, 0.45, 0.09, '#fef08a', 0, H + 0.35, D / 2 + 0.06);
	box(root, 2.2, 0.18, 0.10, '#15803d', 0, H + 0.40, D / 2 + 0.07); // Green text badge
	box(root, 1.6, 0.10, 0.10, '#dc2626', 0, H + 0.22, D / 2 + 0.07); // Subtitle badge

	// ── 3. Billing Counter & Murthy Uncle (Shopkeeper) ───────────────
	// Wooden counter across center-right
	const counter = box(root, 1.8, 0.95, 0.65, '#78350f', 0.8, 0.48, 0.7);

	// Digital/dial weighing scale on counter
	box(root, 0.35, 0.06, 0.35, '#334155', 0.4, 1.0, 0.7); // Scale base
	cylinder(root, 0.22, 0.18, 0.04, '#e2e8f0', 0.4, 1.06, 0.7, 12); // Stainless steel weighing pan
	// UPI / Paytm Soundbox on counter (Bengaluru tech staple!)
	box(root, 0.08, 0.14, 0.08, '#0284c7', 1.25, 1.03, 0.7);
	// QR Stand
	box(root, 0.09, 0.12, 0.03, '#ffffff', 1.45, 1.02, 0.65);

	// Shopkeeper "Murthy Uncle"
	const shopkeeper = new THREE.Group();
	shopkeeper.position.set(0.8, 0, 0.15);
	// Head & mustache
	sphere(shopkeeper, 0.16, '#fdba74', 0, 1.48, 0, 8);
	box(shopkeeper, 0.14, 0.04, 0.05, '#1e293b', 0, 1.43, 0.14); // mustache
	sphere(shopkeeper, 0.17, '#475569', 0, 1.54, -0.03, 6); // grey hair
	// Checked shirt (blue & white)
	cylinder(shopkeeper, 0.22, 0.24, 0.55, '#0284c7', 0, 1.12, 0, 6);
	// White dhoti / trousers
	cylinder(shopkeeper, 0.18, 0.18, 0.75, '#f8fafc', 0, 0.45, 0, 6);
	// Arms resting on counter
	cylinder(shopkeeper, 0.05, 0.05, 0.38, '#0284c7', -0.22, 1.12, 0.2, 5);
	cylinder(shopkeeper, 0.05, 0.05, 0.38, '#0284c7', 0.22, 1.12, 0.2, 5);
	root.add(shopkeeper);

	// ── 4. Slanted Fresh Vegetable & Fruit Crates ────────────────────
	const crateCol = '#0284c7'; // plastic blue crates

	function createVegCrate(vegCol: string, count: number, isSphere: boolean): THREE.Group {
		const g = new THREE.Group();
		// Crate box
		box(g, 0.75, 0.22, 0.55, crateCol, 0, 0.11, 0);
		// Veggies filling crate
		for (let i = 0; i < count; i++) {
			const vx = -0.24 + (i % 3) * 0.24;
			const vz = -0.15 + Math.floor(i / 3) * 0.15;
			if (isSphere) {
				sphere(g, 0.09, vegCol, vx, 0.24, vz, 6);
			} else {
				// Cylinder/elongated like carrots or brinjals
				const c = cylinder(g, 0.04, 0.06, 0.20, vegCol, vx, 0.24, vz, 5);
				c.rotation.z = 0.3;
			}
		}
		return g;
	}

	// Two-tier slanted display rack on the left side
	const rack = new THREE.Group();
	rack.position.set(-1.3, 0, 0.9);
	root.add(rack);

	// Lower tier
	const crateTomatoes = createVegCrate('#ef4444', 6, true); // Red tomatoes
	crateTomatoes.position.set(0, 0.35, 0.4);
	crateTomatoes.rotation.x = 0.25;
	rack.add(crateTomatoes);

	const crateCarrots = createVegCrate('#f97316', 6, false); // Orange Nilgiri carrots
	crateCarrots.position.set(0.8, 0.35, 0.4);
	crateCarrots.rotation.x = 0.25;
	rack.add(crateCarrots);

	// Upper tier
	const crateBrinjal = createVegCrate('#7c3aed', 6, false); // Purple eggplants
	crateBrinjal.position.set(0, 0.75, -0.1);
	crateBrinjal.rotation.x = 0.3;
	rack.add(crateBrinjal);

	const cratePotatoes = createVegCrate('#d97706', 6, true); // Golden potatoes
	cratePotatoes.position.set(0.8, 0.75, -0.1);
	cratePotatoes.rotation.x = 0.3;
	rack.add(cratePotatoes);

	// ── 5. Hanging Bananas & Nimbe-Mensinkai (Talisman) ──────────────
	// Hanging bunch of yellow bananas from awning hook
	const bananaBunch = new THREE.Group();
	bananaBunch.position.set(-0.8, H - 0.4, D / 2 + 0.6);
	cylinder(bananaBunch, 0.015, 0.015, 0.25, '#65a30d', 0, 0.2, 0, 4); // Stem
	for (let b = 0; b < 8; b++) {
		const ba = (b / 8) * Math.PI * 2;
		const ban = cylinder(bananaBunch, 0.03, 0.035, 0.25, '#facc15', Math.cos(ba) * 0.12, 0, Math.sin(ba) * 0.12, 5);
		ban.rotation.z = Math.cos(ba) * 0.2;
		ban.rotation.x = Math.sin(ba) * 0.2;
	}
	root.add(bananaBunch);

	// Hanging Nimbe-Mensinkai (1 lemon + green chillies talisman on string)
	const talisman = new THREE.Group();
	talisman.position.set(1.4, H - 0.35, D / 2 + 0.55);
	cylinder(talisman, 0.005, 0.005, 0.4, '#1e293b', 0, 0.1, 0, 3); // thread
	for (let c = 0; c < 5; c++) {
		cylinder(talisman, 0.015, 0.02, 0.08, '#15803d', 0, -0.05 + c * 0.07, 0, 4); // chillies
	}
	sphere(talisman, 0.055, '#facc15', 0, -0.12, 0, 6); // Lemon at bottom
	root.add(talisman);

	// Hanging snack packets strip
	const chipsStrip = new THREE.Group();
	chipsStrip.position.set(0.1, H - 0.35, D / 2 + 0.65);
	for (let p = 0; p < 4; p++) {
		box(chipsStrip, 0.18, 0.20, 0.03, p % 2 ? '#dc2626' : '#2563eb', 0, -0.15 - p * 0.22, 0);
	}
	root.add(chipsStrip);

	// ── 6. Hessian Burlap Gunny Sacks (Grains & Rice) ───────────────
	const sackCol = '#ca8a04'; // rough hessian jute
	function createGunnySack(grainCol: string, x: number, z: number) {
		const sg = new THREE.Group();
		sg.position.set(x, 0, z);
		// Sack body
		cylinder(sg, 0.28, 0.24, 0.65, sackCol, 0, 0.32, 0, 8);
		// Rolled rim
		const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 6, 12), new THREE.MeshToonMaterial({ color: sackCol }));
		rim.rotation.x = Math.PI / 2;
		rim.position.y = 0.64;
		sg.add(rim);
		// Grains showing on top
		cylinder(sg, 0.24, 0.24, 0.04, grainCol, 0, 0.62, 0, 8);
		root.add(sg);
	}

	createGunnySack('#f8fafc', -1.7, 1.6); // Sona Masoori Rice
	createGunnySack('#eab308', -1.2, 1.8); // Toor Dal
	createGunnySack('#78350f', -1.9, 2.1); // Brown ragi / whole wheat

	// ── 7. Daily Chalkboard Price Board ─────────────────────────────
	const board = new THREE.Group();
	board.position.set(1.9, 0, 1.6);
	board.rotation.y = -0.4;
	box(board, 0.05, 0.9, 0.05, '#92400e', -0.3, 0.45, 0);
	box(board, 0.05, 0.9, 0.05, '#92400e', 0.3, 0.45, 0);
	box(board, 0.65, 0.65, 0.04, '#1e293b', 0, 0.6, 0); // Chalkboard surface
	// White chalk text lines placeholder
	box(board, 0.45, 0.03, 0.05, '#ffffff', 0, 0.75, 0.01);
	box(board, 0.40, 0.03, 0.05, '#ffffff', 0, 0.62, 0.01);
	box(board, 0.48, 0.03, 0.05, '#ffffff', 0, 0.48, 0.01);
	root.add(board);

	// ── 8. Friendly Indie Street Dog Sleeping in the Shade ──────────
	const dog = new THREE.Group();
	dog.position.set(1.4, 0.08, 1.8);
	dog.rotation.y = 0.6;
	sphere(dog, 0.16, '#d97706', 0, 0.1, 0, 8); // curled body
	sphere(dog, 0.10, '#d97706', 0.15, 0.12, 0.08, 6); // head
	sphere(dog, 0.04, '#1e293b', 0.22, 0.10, 0.12, 4); // black snout
	box(dog, 0.04, 0.08, 0.04, '#92400e', 0.14, 0.18, 0.04); // floppy ear
	cylinder(dog, 0.02, 0.03, 0.22, '#d97706', -0.15, 0.05, -0.05, 4); // curled tail
	root.add(dog);

	return {
		group: root,
		width: W + 1.2,
		depth: D + 1.4,
		interactionPos: new THREE.Vector3(0.8, 0, 1.5)
	};
}
