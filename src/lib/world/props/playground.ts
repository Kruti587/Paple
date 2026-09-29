import * as THREE from 'three';
import { box, cylinder, sphere } from './util';
import { PALETTE } from '../constants';

export interface Playground {
	group: THREE.Group;
	update(time: number, dt: number): void;
	radius: number;
}

/**
 * Creates an authentic lively children's playground (like Bal Bhavan in Cubbon Park)
 * with animated swings, see-saw, slide with sliding kid, spinning carousel, sand pit,
 * benches, and colorful garden surroundings.
 */
export function createPlayground(): Playground {
	const root = new THREE.Group();
	const RADIUS = 4.8;

	// ── 1. Playground Sandy Base & Curbing ───────────────────────────
	const sandMat = new THREE.MeshToonMaterial({ color: '#fef08a' }); // Warm playground sand
	const sandGeo = new THREE.CylinderGeometry(RADIUS, RADIUS, 0.08, 32);
	const sandBase = new THREE.Mesh(sandGeo, sandMat);
	sandBase.position.y = 0.04;
	sandBase.receiveShadow = true;
	root.add(sandBase);

	// Stone curbing ring around perimeter
	const curbMat = new THREE.MeshToonMaterial({ color: '#94a3b8' });
	const curbCount = 28;
	for (let i = 0; i < curbCount; i++) {
		const angle = (i / curbCount) * Math.PI * 2;
		const cx = Math.cos(angle) * (RADIUS + 0.1);
		const cz = Math.sin(angle) * (RADIUS + 0.1);
		const curb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.22), curbMat);
		curb.position.set(cx, 0.07, cz);
		curb.rotation.y = -angle + Math.PI / 2;
		root.add(curb);
	}

	// ── Helper to create a stylized low-poly kid figure ─────────────
	function createKid(shirtCol: string, pantsCol: string): THREE.Group {
		const kid = new THREE.Group();
		// Head & hair
		sphere(kid, 0.12, '#fdba74', 0, 0.68, 0, 8); // head
		sphere(kid, 0.13, '#1e293b', 0, 0.72, -0.02, 6); // hair cap
		// Torso
		cylinder(kid, 0.11, 0.13, 0.26, shirtCol, 0, 0.44, 0, 6);
		// Legs
		cylinder(kid, 0.045, 0.045, 0.22, pantsCol, -0.06, 0.18, 0, 5);
		cylinder(kid, 0.045, 0.045, 0.22, pantsCol, 0.06, 0.18, 0, 5);
		// Shoes
		box(kid, 0.08, 0.06, 0.12, '#334155', -0.06, 0.04, 0.02);
		box(kid, 0.08, 0.06, 0.12, '#334155', 0.06, 0.04, 0.02);
		// Arms
		cylinder(kid, 0.035, 0.035, 0.20, shirtCol, -0.14, 0.42, 0, 5);
		cylinder(kid, 0.035, 0.035, 0.20, shirtCol, 0.14, 0.42, 0, 5);
		return kid;
	}

	// ── 2. Animated Swings Set ──────────────────────────────────────
	const swingSetGroup = new THREE.Group();
	swingSetGroup.position.set(-2.0, 0, -1.2);
	root.add(swingSetGroup);

	// A-frame metal side posts
	const frameCol = '#0284c7'; // vibrant sky blue
	for (const side of [-1, 1]) {
		const x = side * 1.35;
		const leg1 = cylinder(swingSetGroup, 0.04, 0.04, 2.1, frameCol, x - 0.25, 1.0, 0, 6);
		leg1.rotation.z = -side * 0.15;
		const leg2 = cylinder(swingSetGroup, 0.04, 0.04, 2.1, frameCol, x + 0.25, 1.0, 0, 6);
		leg2.rotation.z = side * 0.15;
		// cross brace
		box(swingSetGroup, 0.5, 0.04, 0.04, frameCol, x, 0.65, 0);
	}
	// Top crossbar
	const topBar = cylinder(swingSetGroup, 0.05, 0.05, 2.9, frameCol, 0, 1.95, 0, 8);
	topBar.rotation.z = Math.PI / 2;

	// Two animated swing seats
	interface SwingObj {
		pivot: THREE.Group;
		kid: THREE.Group;
		phase: number;
		speed: number;
	}
	const swings: SwingObj[] = [];

	for (let s = 0; s < 2; s++) {
		const pivot = new THREE.Group();
		pivot.position.set(-0.55 + s * 1.1, 1.95, 0);
		swingSetGroup.add(pivot);

		// Chains
		const chainL = cylinder(pivot, 0.015, 0.015, 1.4, '#94a3b8', -0.20, -0.7, 0, 4);
		const chainR = cylinder(pivot, 0.015, 0.015, 1.4, '#94a3b8', 0.20, -0.7, 0, 4);

		// Swing seat
		box(pivot, 0.48, 0.04, 0.22, s === 0 ? '#ef4444' : '#f59e0b', 0, -1.4, 0);

		// Kid on swing
		const kid = createKid(s === 0 ? '#38bdf8' : '#a855f7', '#1e293b');
		kid.position.set(0, -1.38, 0);
		// Seated leg pose
		pivot.add(kid);

		swings.push({ pivot, kid, phase: s * 1.6, speed: 2.7 });
	}

	// ── 3. Animated Slide ───────────────────────────────────────────
	const slideGroup = new THREE.Group();
	slideGroup.position.set(2.0, 0, -1.5);
	root.add(slideGroup);

	// Ladder & Platform
	const platH = 1.6;
	// 4 legs
	cylinder(slideGroup, 0.04, 0.04, platH, '#15803d', -0.4, platH / 2, -0.4, 6);
	cylinder(slideGroup, 0.04, 0.04, platH, '#15803d', 0.4, platH / 2, -0.4, 6);
	cylinder(slideGroup, 0.04, 0.04, platH, '#15803d', -0.4, platH / 2, 0.4, 6);
	cylinder(slideGroup, 0.04, 0.04, platH, '#15803d', 0.4, platH / 2, 0.4, 6);
	// Platform deck
	box(slideGroup, 0.9, 0.06, 0.9, '#f59e0b', 0, platH, 0);
	// Guardrails
	box(slideGroup, 0.9, 0.45, 0.04, '#16a34a', 0, platH + 0.25, -0.42);
	box(slideGroup, 0.04, 0.45, 0.9, '#16a34a', -0.42, platH + 0.25, 0);
	// Slide canopy roof
	const roof = new THREE.Mesh(
		new THREE.ConeGeometry(0.7, 0.4, 4),
		new THREE.MeshToonMaterial({ color: '#dc2626' })
	);
	roof.position.set(0, platH + 0.65, 0);
	roof.rotation.y = Math.PI / 4;
	slideGroup.add(roof);

	// Ladder rungs (on z = -0.4 side)
	for (let r = 0; r < 5; r++) {
		box(slideGroup, 0.6, 0.03, 0.05, '#facc15', 0, 0.3 + r * 0.28, -0.42);
	}

	// Slanted Slide Chute (facing forward +Z)
	const chuteLen = 2.4;
	const chute = box(slideGroup, 0.6, 0.05, chuteLen, '#facc15', 0, platH * 0.55, 1.05);
	chute.rotation.x = 0.58; // slope downwards
	// Chute guard rims
	const rimL = box(slideGroup, 0.05, 0.16, chuteLen, '#ea580c', -0.28, platH * 0.55 + 0.05, 1.05);
	rimL.rotation.x = 0.58;
	const rimR = box(slideGroup, 0.05, 0.16, chuteLen, '#ea580c', 0.28, platH * 0.55 + 0.05, 1.05);
	rimR.rotation.x = 0.58;

	// Animated Kid sliding down
	const slidingKid = createKid('#f97316', '#0284c7');
	slidingKid.rotation.x = 0.58;
	slideGroup.add(slidingKid);

	// ── 4. Animated See-Saw ─────────────────────────────────────────
	const seesawGroup = new THREE.Group();
	seesawGroup.position.set(-1.6, 0, 1.8);
	root.add(seesawGroup);

	// Central triangular pivot post
	const fulcrum = cylinder(seesawGroup, 0.08, 0.16, 0.55, '#475569', 0, 0.27, 0, 6);
	fulcrum.rotation.z = Math.PI / 2;

	// Rocking plank
	const plankPivot = new THREE.Group();
	plankPivot.position.set(0, 0.55, 0);
	seesawGroup.add(plankPivot);

	const plank = box(plankPivot, 2.6, 0.06, 0.32, '#ec4899', 0, 0, 0);
	// Handlebars
	for (const side of [-1, 1]) {
		const hx = side * 1.0;
		cylinder(plankPivot, 0.02, 0.02, 0.22, '#cbd5e1', hx, 0.12, 0, 5);
		const crossT = cylinder(plankPivot, 0.02, 0.02, 0.26, '#cbd5e1', hx, 0.22, 0, 5);
		crossT.rotation.x = Math.PI / 2;
	}

	// Two kids sitting at the ends of the seesaw
	const seeKid1 = createKid('#10b981', '#334155');
	seeKid1.position.set(-1.05, 0.05, 0);
	seeKid1.rotation.y = Math.PI / 2;
	plankPivot.add(seeKid1);

	const seeKid2 = createKid('#6366f1', '#e11d48');
	seeKid2.position.set(1.05, 0.05, 0);
	seeKid2.rotation.y = -Math.PI / 2;
	plankPivot.add(seeKid2);

	// ── 5. Spinning Merry-Go-Round / Carousel ───────────────────────
	const carouselGroup = new THREE.Group();
	carouselGroup.position.set(1.6, 0, 1.7);
	root.add(carouselGroup);

	// Fixed center base
	cylinder(carouselGroup, 0.12, 0.18, 0.35, '#475569', 0, 0.17, 0, 8);

	// Spinning disk
	const spinDisk = new THREE.Group();
	spinDisk.position.set(0, 0.25, 0);
	carouselGroup.add(spinDisk);

	const diskGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.06, 16);
	const diskMat = new THREE.MeshToonMaterial({ color: '#38bdf8' });
	const diskMesh = new THREE.Mesh(diskGeo, diskMat);
	spinDisk.add(diskMesh);

	// Colorful pie segments on disk
	for (let p = 0; p < 4; p++) {
		const seg = box(spinDisk, 0.45, 0.02, 0.45, p % 2 ? '#facc15' : '#ef4444', 
			Math.cos(p * Math.PI / 2 + 0.4) * 0.6, 0.04, Math.sin(p * Math.PI / 2 + 0.4) * 0.6);
		seg.rotation.y = p * Math.PI / 2;
	}

	// Tubular handrails for kids to hold
	for (let b = 0; b < 4; b++) {
		const angle = (b / 4) * Math.PI * 2;
		const bar = cylinder(spinDisk, 0.025, 0.025, 0.75, '#f1f5f9', Math.cos(angle) * 0.85, 0.4, Math.sin(angle) * 0.85, 6);
	}
	// Center handrail wheel
	const wheelMat = new THREE.MeshToonMaterial({ color: '#ef4444' });
	const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 6, 16), wheelMat);
	wheel.rotation.x = Math.PI / 2;
	wheel.position.y = 0.75;
	spinDisk.add(wheel);

	// Kids riding carousel
	const rideKid1 = createKid('#f43f5e', '#0f172a');
	rideKid1.position.set(0.65, 0.05, 0);
	rideKid1.rotation.y = -Math.PI / 2;
	spinDisk.add(rideKid1);

	const rideKid2 = createKid('#eab308', '#2563eb');
	rideKid2.position.set(-0.65, 0.05, 0);
	rideKid2.rotation.y = Math.PI / 2;
	spinDisk.add(rideKid2);

	// ── 6. Sand Pit Toys (Bucket & Spade) ───────────────────────────
	const bucket = cylinder(root, 0.12, 0.08, 0.18, '#dc2626', 0.2, 0.12, 0.1, 8);
	const spade = box(root, 0.04, 0.02, 0.22, '#3b82f6', 0.38, 0.06, 0.15);
	spade.rotation.y = 0.4;

	// ── 7. Park Benches with Resting Parents ────────────────────────
	function createBench(x: number, z: number, rotY: number, hasParent: boolean) {
		const bg = new THREE.Group();
		bg.position.set(x, 0, z);
		bg.rotation.y = rotY;

		// Wooden slats
		const slatCol = '#b45309';
		for (let s = 0; s < 3; s++) {
			box(bg, 1.2, 0.03, 0.10, slatCol, 0, 0.38, -0.1 + s * 0.11);
		}
		// Backrest slats
		for (let b = 0; b < 2; b++) {
			box(bg, 1.2, 0.08, 0.03, slatCol, 0, 0.55 + b * 0.11, -0.18);
		}
		// Cast iron legs
		const legCol = '#1e293b';
		for (const sx of [-0.5, 0.5]) {
			cylinder(bg, 0.03, 0.03, 0.38, legCol, sx, 0.19, -0.12, 5);
			cylinder(bg, 0.03, 0.03, 0.38, legCol, sx, 0.19, 0.12, 5);
			cylinder(bg, 0.03, 0.03, 0.35, legCol, sx, 0.55, -0.18, 5);
		}

		if (hasParent) {
			// Stylized adult parent resting
			const parent = new THREE.Group();
			sphere(parent, 0.15, '#fdba74', 0, 0.95, -0.05, 8); // head
			cylinder(parent, 0.16, 0.18, 0.42, '#047857', 0, 0.65, -0.05, 6); // kurti/shirt
			cylinder(parent, 0.06, 0.06, 0.35, '#f8fafc', -0.09, 0.35, 0.1, 5); // legs
			cylinder(parent, 0.06, 0.06, 0.35, '#f8fafc', 0.09, 0.35, 0.1, 5);
			// Newspaper/phone in hands
			box(parent, 0.22, 0.02, 0.15, '#f1f5f9', 0, 0.52, 0.15);
			parent.position.set(0.15, 0, 0);
			bg.add(parent);
		}

		root.add(bg);
	}

	createBench(0, 3.8, Math.PI, true);
	createBench(0, -3.8, 0, false);

	// ── 8. Flowering Bushes & Garden Tufts ──────────────────────────
	const flowerColors = ['#f43f5e', '#ec4899', '#fbbf24', '#a855f7'];
	for (let f = 0; f < 10; f++) {
		const angle = (f / 10) * Math.PI * 2 + 0.15;
		const fx = Math.cos(angle) * (RADIUS + 0.6);
		const fz = Math.sin(angle) * (RADIUS + 0.6);
		const bush = sphere(root, 0.32, PALETTE.rainTree, fx, 0.25, fz, 6);
		// Little flower blossoms on bush
		for (let b = 0; b < 4; b++) {
			const ba = b * 1.5;
			sphere(root, 0.07, flowerColors[(f + b) % flowerColors.length], 
				fx + Math.cos(ba) * 0.22, 0.38, fz + Math.sin(ba) * 0.22, 4);
		}
	}

	return {
		group: root,
		radius: RADIUS + 0.8,
		update(time: number, dt: number) {
			// 1. Swings oscillation
			for (const sw of swings) {
				const angle = Math.sin(time * sw.speed + sw.phase) * 0.42;
				sw.pivot.rotation.x = angle;
			}

			// 2. See-saw rocking
			plankPivot.rotation.z = Math.sin(time * 2.2) * 0.25;

			// 3. Carousel spinning
			spinDisk.rotation.y = time * 1.6;

			// 4. Slide kid continuous loop
			// A 4-second sliding loop: 0-2s slide down, 2-3s climb back
			const slideLoop = (time * 0.6) % 1.0;
			if (slideLoop < 0.7) {
				// Sliding down the chute
				const t = slideLoop / 0.7;
				const startY = platH + 0.15;
				const endY = 0.25;
				const startZ = 0.1;
				const endZ = 2.0;
				slidingKid.position.set(0, THREE.MathUtils.lerp(startY, endY, t), THREE.MathUtils.lerp(startZ, endZ, t));
				slidingKid.visible = true;
			} else {
				// Resetting / climbing up
				const t = (slideLoop - 0.7) / 0.3;
				slidingKid.position.set(0, THREE.MathUtils.lerp(0.2, platH, t), -0.4);
				slidingKid.visible = t > 0.5;
			}
		}
	};
}
