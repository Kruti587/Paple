import * as THREE from 'three';
import { box, sphere, cylinder } from './util';

export interface WildlifeSystem {
	group: THREE.Group;
	update(elapsed: number, dt: number): void;
}

/**
 * Creates ambient birds orbiting treetops, fluttering butterflies around flower bushes,
 * and rabbits hopping through the park and boulder clearings.
 */
export function createWildlifeSystem(parkCenter: THREE.Vector3, lakeCenter?: THREE.Vector3): WildlifeSystem {
	const root = new THREE.Group();

	// ── 1. Flock of Birds circling the treetops ───────────────────────────
	const birdFlock = new THREE.Group();
	const birds: { mesh: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh; phase: number; radius: number; height: number; speed: number }[] = [];

	for (let i = 0; i < 6; i++) {
		const bg = new THREE.Group();
		// Bird body
		sphere(bg, 0.08, '#334155', 0, 0, 0, 6);
		sphere(bg, 0.05, '#f59e0b', 0, 0, 0.09, 4); // beak

		// Wings (hinged boxes that flap)
		const wingL = box(bg, 0.18, 0.015, 0.08, '#1e293b', -0.11, 0.02, 0);
		const wingR = box(bg, 0.18, 0.015, 0.08, '#1e293b',  0.11, 0.02, 0);

		birdFlock.add(bg);
		birds.push({
			mesh: bg,
			wingL,
			wingR,
			phase: i * 1.1,
			radius: 3.5 + (i % 3) * 1.2,
			height: 5.5 + (i % 2) * 1.5,
			speed: 0.8 + (i % 3) * 0.2
		});
	}
	root.add(birdFlock);

	// ── 2. Fluttering Butterflies near flowers ─────────────────────────────
	const butterflyGroup = new THREE.Group();
	const butterflies: { group: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh; origin: THREE.Vector3; phase: number }[] = [];
	const butterflyColors = ['#f97316', '#38bdf8', '#fbbf24', '#ec4899'];

	for (let i = 0; i < 8; i++) {
		const b = new THREE.Group();
		const col = butterflyColors[i % butterflyColors.length];

		// Tiny body
		cylinder(b, 0.015, 0.015, 0.08, '#1e1b4b', 0, 0, 0, 4);

		// Two flat wings
		const wingL = box(b, 0.10, 0.01, 0.08, col, -0.05, 0, 0);
		const wingR = box(b, 0.10, 0.01, 0.08, col,  0.05, 0, 0);

		butterflyGroup.add(b);
		// Placed in a spread around the park / vegetation
		const angle = (i / 8) * Math.PI * 2;
		const r = 2.0 + (i % 3) * 1.4;
		const ox = Math.cos(angle) * r;
		const oz = Math.sin(angle) * r;

		butterflies.push({
			group: b,
			wingL,
			wingR,
			origin: new THREE.Vector3(ox, 0.8 + (i % 3) * 0.4, oz),
			phase: i * 0.85
		});
	}
	root.add(butterflyGroup);

	// ── 3. Hopping Rabbits ─────────────────────────────────────────────────
	const rabbitGroup = new THREE.Group();
	const rabbits: { group: THREE.Group; ears: THREE.Group; basePos: THREE.Vector3; hopTimer: number; hopPhase: number }[] = [];

	for (let i = 0; i < 4; i++) {
		const rg = new THREE.Group();
		// Body
		const body = sphere(rg, 0.16, '#f1f5f9', 0, 0.16, 0, 8);
		body.scale.set(1, 0.8, 1.2);
		// Fluffy tail
		sphere(rg, 0.05, '#ffffff', 0, 0.18, -0.18, 6);
		// Head
		sphere(rg, 0.11, '#f1f5f9', 0, 0.28, 0.14, 8);
		// Nose twitcher
		sphere(rg, 0.02, '#f43f5e', 0, 0.28, 0.24, 4);

		// Long upright ears
		const ears = new THREE.Group();
		ears.position.set(0, 0.36, 0.12);
		const earL = cylinder(ears, 0.02, 0.03, 0.16, '#e2e8f0', -0.04, 0.08, 0, 6);
		const earR = cylinder(ears, 0.02, 0.03, 0.16, '#e2e8f0',  0.04, 0.08, 0, 6);
		earL.rotation.z = -0.15;
		earR.rotation.z = 0.15;
		rg.add(ears);

		rabbitGroup.add(rg);
		const rAngle = (i / 4) * Math.PI * 2 + 0.4;
		const basePos = new THREE.Vector3(Math.cos(rAngle) * (2.8 + i * 0.8), 0, Math.sin(rAngle) * (2.8 + i * 0.8));
		rg.position.copy(basePos);

		rabbits.push({
			group: rg,
			ears,
			basePos,
			hopTimer: i * 0.9,
			hopPhase: 0
		});
	}
	root.add(rabbitGroup);

	return {
		group: root,
		update(elapsed: number, dt: number) {
			// Update birds
			for (const b of birds) {
				const angle = elapsed * b.speed + b.phase;
				b.mesh.position.set(Math.cos(angle) * b.radius, b.height + Math.sin(elapsed * 2 + b.phase) * 0.4, Math.sin(angle) * b.radius);
				// Face direction of travel
				b.mesh.rotation.y = -angle + Math.PI / 2;
				// Wing flap
				const flap = Math.sin(elapsed * 12 + b.phase) * 0.7;
				b.wingL.rotation.z = flap;
				b.wingR.rotation.z = -flap;
			}

			// Update butterflies
			for (const bf of butterflies) {
				const time = elapsed * 1.5 + bf.phase;
				// Figure-8 flight pattern
				const fx = Math.sin(time) * 1.2;
				const fz = Math.sin(time * 2) * 0.6;
				const fy = Math.sin(time * 3) * 0.35;
				bf.group.position.set(bf.origin.x + fx, bf.origin.y + fy, bf.origin.z + fz);

				// Fast fluttering wings
				const wingFlap = Math.sin(elapsed * 26 + bf.phase) * 0.85;
				bf.wingL.rotation.y = wingFlap;
				bf.wingR.rotation.y = -wingFlap;
			}

			// Update rabbits (hopping periodically)
			for (const r of rabbits) {
				r.hopTimer += dt;
				if (r.hopTimer > 3.0) {
					r.hopPhase += dt * 8;
					if (r.hopPhase < Math.PI) {
						r.group.position.y = Math.sin(r.hopPhase) * 0.28;
					} else {
						r.group.position.y = 0;
						r.hopPhase = 0;
						r.hopTimer = Math.random() * 0.8;
					}
				}
				// Nose twitch / ear wiggle
				r.ears.rotation.x = Math.sin(elapsed * 5) * 0.08;
			}
		}
	};
}
