import * as THREE from 'three';
import { box, cylinder, sphere } from './util';
import { PALETTE } from '../constants';

export interface LotusPond {
	group: THREE.Group;
	radius: number;
	update(time: number, dt: number): void;
}

/**
 * Creates a scenic secondary Bengaluru Lotus Pond (like Sankey Tank / Lalbagh Lotus Lake)
 * with an arched wooden footbridge, water lilies, pink lotus blossoms, cattails,
 * and animated swimming ducks paddling on the water.
 */
export function createLotusPond(): LotusPond {
	const root = new THREE.Group();
	const POND_RADIUS = 5.2;

	// ── 1. Stone Embankment & Basin ─────────────────────────────────
	// Cobblestone rim
	const rimMat = new THREE.MeshToonMaterial({ color: '#64748b' });
	const rimSegments = 32;
	for (let i = 0; i < rimSegments; i++) {
		const angle = (i / rimSegments) * Math.PI * 2;
		const rx = Math.cos(angle) * POND_RADIUS;
		const rz = Math.sin(angle) * POND_RADIUS;
		const stone = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.35), rimMat);
		stone.position.set(rx, 0.11, rz);
		stone.rotation.y = -angle + Math.PI / 2;
		root.add(stone);
	}

	// Water bed & surface
	const waterMat = new THREE.MeshToonMaterial({
		color: '#0284c7', // rich sky/lake blue
		transparent: true,
		opacity: 0.85
	});
	const waterGeo = new THREE.CylinderGeometry(POND_RADIUS - 0.1, POND_RADIUS - 0.1, 0.1, 32);
	const water = new THREE.Mesh(waterGeo, waterMat);
	water.position.y = 0.05;
	root.add(water);

	// Light blue shallow wave ring
	const waveGeo = new THREE.RingGeometry(POND_RADIUS - 1.2, POND_RADIUS - 0.2, 32);
	const waveMat = new THREE.MeshBasicMaterial({ color: '#7dd3fc', side: THREE.DoubleSide });
	const wave = new THREE.Mesh(waveGeo, waveMat);
	wave.rotation.x = -Math.PI / 2;
	wave.position.y = 0.06;
	root.add(wave);

	// ── 2. Arched Wooden Footbridge Crossing the Pond ───────────────
	const bridgeGroup = new THREE.Group();
	bridgeGroup.position.set(0, 0, 0); // Spans across pond along X axis
	root.add(bridgeGroup);

	const bridgePlanks = 16;
	const bridgeSpan = 7.2;
	const bridgeArch = 0.65; // Arch apex height
	const plankMat = new THREE.MeshToonMaterial({ color: '#b45309' }); // warm teak wood
	const railMat = new THREE.MeshToonMaterial({ color: '#78350f' });

	// Arch planks
	for (let i = 0; i <= bridgePlanks; i++) {
		const t = (i / bridgePlanks) * 2 - 1; // -1 to 1
		const x = (i / bridgePlanks - 0.5) * bridgeSpan;
		const y = (1 - t * t) * bridgeArch + 0.15;
		const slope = -2 * t * bridgeArch / (bridgeSpan / 2); // derivative for slope angle

		const plank = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 1.4), plankMat);
		plank.position.set(x, y, 0);
		plank.rotation.z = Math.atan(slope);
		bridgeGroup.add(plank);

		// Guardrail posts on sides
		if (i % 3 === 0) {
			for (const side of [-1, 1]) {
				const z = side * 0.65;
				const post = cylinder(bridgeGroup, 0.035, 0.035, 0.75, '#78350f', x, y + 0.35, z, 5);
			}
		}
	}

	// Curved side handrails
	for (const side of [-1, 1]) {
		const z = side * 0.65;
		for (let i = 0; i < bridgePlanks; i++) {
			const x1 = (i / bridgePlanks - 0.5) * bridgeSpan;
			const x2 = ((i + 1) / bridgePlanks - 0.5) * bridgeSpan;
			const t1 = (i / bridgePlanks) * 2 - 1;
			const t2 = ((i + 1) / bridgePlanks) * 2 - 1;
			const y1 = (1 - t1 * t1) * bridgeArch + 0.85;
			const y2 = (1 - t2 * t2) * bridgeArch + 0.85;

			const segLen = Math.hypot(x2 - x1, y2 - y1);
			const railSeg = new THREE.Mesh(new THREE.BoxGeometry(segLen + 0.04, 0.05, 0.06), railMat);
			railSeg.position.set((x1 + x2) / 2, (y1 + y2) / 2, z);
			railSeg.rotation.z = Math.atan2(y2 - y1, x2 - x1);
			bridgeGroup.add(railSeg);
		}
	}

	// ── 3. Water Lilies & Blooming Lotus Flowers ─────────────────────
	const lilyMat = new THREE.MeshToonMaterial({ color: '#15803d' }); // rich green pad
	const lotusPetalMat = new THREE.MeshToonMaterial({ color: '#f472b6' }); // vibrant pink lotus
	const lotusCenterMat = new THREE.MeshToonMaterial({ color: '#facc15' }); // golden center stamen

	function createLotusCluster(cx: number, cz: number, flowerCount: number) {
		const g = new THREE.Group();
		g.position.set(cx, 0.06, cz);

		// Lily pad discs
		for (let p = 0; p < 5; p++) {
			const angle = (p / 5) * Math.PI * 2 + 0.3;
			const dist = 0.2 + (p % 2) * 0.3;
			const px = Math.cos(angle) * dist;
			const pz = Math.sin(angle) * dist;

			const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.02, 12), lilyMat);
			pad.position.set(px, 0.01, pz);
			g.add(pad);
		}

		// Lotus blossoms
		for (let f = 0; f < flowerCount; f++) {
			const fa = f * 2.1;
			const fx = Math.cos(fa) * 0.25;
			const fz = Math.sin(fa) * 0.25;
			const flower = new THREE.Group();
			flower.position.set(fx, 0.04, fz);

			// Center stamen
			cylinder(flower, 0.05, 0.04, 0.08, '#facc15', 0, 0.04, 0, 6);

			// Surrounding pink petals
			for (let pet = 0; pet < 6; pet++) {
				const pa = (pet / 6) * Math.PI * 2;
				const petal = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), lotusPetalMat);
				petal.scale.set(0.6, 1.4, 0.4);
				petal.position.set(Math.cos(pa) * 0.06, 0.06, Math.sin(pa) * 0.06);
				petal.rotation.y = pa;
				petal.rotation.z = 0.35;
				flower.add(petal);
			}
			g.add(flower);
		}
		root.add(g);
	}

	createLotusCluster(-2.2, 2.2, 2);
	createLotusCluster(-1.4, -2.4, 3);
	createLotusCluster(2.4, 1.8, 2);
	createLotusCluster(2.1, -2.2, 2);

	// ── 4. Shoreline Cattails & Green Reeds ──────────────────────────
	const reedMat = new THREE.MeshToonMaterial({ color: '#166534' });
	const cattailMat = new THREE.MeshToonMaterial({ color: '#78350f' });

	for (let r = 0; r < 8; r++) {
		const angle = (r / 8) * Math.PI * 2 + 0.4;
		const rx = Math.cos(angle) * (POND_RADIUS - 0.4);
		const rz = Math.sin(angle) * (POND_RADIUS - 0.4);

		for (let c = 0; c < 3; c++) {
			const ox = rx + (c - 1) * 0.14;
			const oz = rz + (c % 2) * 0.12;
			// Green stalk
			cylinder(root, 0.015, 0.015, 0.75, '#166534', ox, 0.4, oz, 4);
			// Brown cattail sausage on top
			cylinder(root, 0.035, 0.035, 0.22, '#78350f', ox, 0.72, oz, 5);
		}
	}

	// ── 5. Animated Swimming Ducks ──────────────────────────────────
	interface Duck {
		group: THREE.Group;
		center: THREE.Vector2;
		radius: number;
		speed: number;
		phase: number;
	}
	const ducks: Duck[] = [];

	function createDuck(isMallard: boolean): THREE.Group {
		const dg = new THREE.Group();
		const bodyCol = isMallard ? '#78350f' : '#f8fafc'; // brown mallard or white duck
		const headCol = isMallard ? '#047857' : '#f8fafc'; // iridescent emerald green head for mallard
		const beakCol = '#f59e0b'; // orange beak

		// Body (floating on water)
		const body = sphere(dg, 0.16, bodyCol, 0, 0.08, 0, 8);
		body.scale.set(0.9, 0.7, 1.4);

		// Tail feathers angled up
		const tail = box(dg, 0.08, 0.04, 0.12, bodyCol, 0, 0.12, -0.16);
		tail.rotation.x = -0.45;

		// Head and neck
		cylinder(dg, 0.045, 0.06, 0.14, headCol, 0, 0.18, 0.12, 6);
		sphere(dg, 0.07, headCol, 0, 0.26, 0.14, 7);

		// Orange bill / beak
		const beak = box(dg, 0.06, 0.025, 0.09, beakCol, 0, 0.25, 0.23);

		return dg;
	}

	// 3 Ducks paddling in different pond quadrants
	const duckConfigs = [
		{ cx: 0, cz: 2.2, r: 1.1, speed: 0.75, phase: 0, mallard: true },
		{ cx: -1.8, cz: 0.5, r: 0.9, speed: -0.65, phase: 2.1, mallard: false },
		{ cx: 1.8, cz: -1.0, r: 1.2, speed: 0.70, phase: 4.2, mallard: true }
	];

	for (const cfg of duckConfigs) {
		const duckMesh = createDuck(cfg.mallard);
		root.add(duckMesh);
		ducks.push({
			group: duckMesh,
			center: new THREE.Vector2(cfg.cx, cfg.cz),
			radius: cfg.r,
			speed: cfg.speed,
			phase: cfg.phase
		});
	}

	// ── 6. Park Bench beside the Pond ───────────────────────────────
	const benchGroup = new THREE.Group();
	benchGroup.position.set(POND_RADIUS + 0.6, 0, 0);
	benchGroup.rotation.y = -Math.PI / 2; // Facing the lotus pond
	for (let s = 0; s < 3; s++) {
		box(benchGroup, 1.2, 0.03, 0.10, '#b45309', 0, 0.38, -0.1 + s * 0.11);
	}
	for (let b = 0; b < 2; b++) {
		box(benchGroup, 1.2, 0.08, 0.03, '#b45309', 0, 0.55 + b * 0.11, -0.18);
	}
	for (const sx of [-0.5, 0.5]) {
		cylinder(benchGroup, 0.03, 0.03, 0.38, '#1e293b', sx, 0.19, -0.12, 5);
		cylinder(benchGroup, 0.03, 0.03, 0.38, '#1e293b', sx, 0.19, 0.12, 5);
	}
	root.add(benchGroup);

	return {
		group: root,
		radius: POND_RADIUS + 1.2,
		update(time: number, dt: number) {
			// Subtle water shimmer
			wave.rotation.z = time * 0.2;

			// Animated swimming ducks
			for (const d of ducks) {
				const angle = time * d.speed + d.phase;
				const x = d.center.x + Math.cos(angle) * d.radius;
				const z = d.center.y + Math.sin(angle) * d.radius;
				const yBob = 0.05 + Math.sin(time * 3.5 + d.phase) * 0.015;

				d.group.position.set(x, yBob, z);
				// Face the direction of swimming tangent
				const heading = angle + (d.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
				d.group.rotation.y = -heading + Math.PI / 2;
			}
		}
	};
}
