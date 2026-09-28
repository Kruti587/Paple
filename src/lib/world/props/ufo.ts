import * as THREE from 'three';
import { box, cylinder, sphere, blob } from './util';
import { PALETTE } from '../constants';

export interface BrokenUFO {
	group: THREE.Group;
	dome: THREE.Mesh;
	update(elapsed: number): void;
}

/**
 * Broken alien flying saucer crash-landed at an angle.
 * Features scorched metallic saucer, cracked dome, sparking antenna, and smoke trail.
 */
export function createBrokenUFO(): BrokenUFO {
	const g = new THREE.Group();

	// Main metallic saucer hull
	const hull = sphere(g, 2.2, '#7b8c9e', 0, 0.6, 0, 18);
	hull.scale.set(1.4, 0.28, 1.4);

	// Lower engine rim ring
	const ring = cylinder(g, 2.6, 2.6, 0.14, '#4a5b6d', 0, 0.52, 0, 20);

	// Glowing energy rim pods (some flickering or damaged)
	for (let i = 0; i < 8; i++) {
		const angle = (i / 8) * Math.PI * 2;
		const px = Math.cos(angle) * 2.5;
		const pz = Math.sin(angle) * 2.5;
		const pod = sphere(g, 0.14, i % 3 === 0 ? '#ff4d4d' : '#2ec4b6', px, 0.52, pz, 8);
	}

	// Translucent cockpit dome
	const dome = sphere(g, 1.1, '#5eead4', 0, 0.95, 0, 16);
	dome.scale.set(1, 0.8, 1);

	// Scorch marks / crash damage
	const scorch = cylinder(g, 0.8, 1.0, 0.05, '#262626', 0.8, 0.65, -0.6, 8);
	scorch.rotation.z = 0.2;

	// Bent broken communication antenna
	const antBase = cylinder(g, 0.04, 0.06, 0.4, '#c0c0c0', -0.6, 1.3, 0.3, 6);
	const antBent = cylinder(g, 0.03, 0.03, 0.6, '#c0c0c0', -0.85, 1.5, 0.4, 6);
	antBent.rotation.z = -0.7;
	sphere(g, 0.08, '#f59e0b', -1.1, 1.65, 0.4, 8); // antenna tip

	// Alien repair hatch (open/exposed circuit panel)
	box(g, 0.65, 0.45, 0.08, '#1e293b', 0.5, 0.85, 1.4);
	// Missing component slots (glowing indicator for Titanium Strut & Capacitor)
	box(g, 0.18, 0.25, 0.05, '#ff5722', 0.4, 0.85, 1.45);
	box(g, 0.18, 0.25, 0.05, '#00bcd4', 0.62, 0.85, 1.45);

	// Sparks group
	const sparks = new THREE.Group();
	const sparkSpheres: THREE.Mesh[] = [];
	for (let i = 0; i < 4; i++) {
		const sp = sphere(sparks, 0.05, '#facc15', -0.85 + (i - 2) * 0.1, 1.5, 0.4, 6);
		sparkSpheres.push(sp);
	}
	g.add(sparks);

	// Tilt the entire saucer 22 degrees into the dirt
	g.rotation.z = 0.38;
	g.rotation.x = -0.15;

	return {
		group: g,
		dome,
		update(elapsed: number) {
			// Spark flickering
			sparks.visible = Math.sin(elapsed * 18) > 0.2;
			for (let i = 0; i < sparkSpheres.length; i++) {
				sparkSpheres[i].position.y = 1.5 + Math.sin(elapsed * 24 + i) * 0.15;
			}
		}
	};
}
