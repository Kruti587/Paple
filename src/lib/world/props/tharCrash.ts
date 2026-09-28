import * as THREE from 'three';
import { box, cylinder, sphere } from './util';

export interface TharCrashEvent {
	group: THREE.Group;
	update: (elapsed: number, dt: number) => void;
	getChatter: (playerPos: THREE.Vector3) => string | null;
}

/** Creates the one-of-a-kind Mahindra Thar Crash into Electric Pole with Bangalore crowd. */
export function createTharCrashEvent(): TharCrashEvent {
	const g = new THREE.Group();

	// ── 1. CRUMPLED ROADSIDE UTILITY POLE ──────────────────────────────────
	const poleGroup = new THREE.Group();
	poleGroup.position.set(0.6, 0, 0);

	// Concrete base stub fractured at ground
	cylinder(poleGroup, 0.16, 0.18, 0.5, '#475569', 0, 0.25, 0, 8);
	// Debris / concrete rubble chunks on ground
	for (let c = 0; c < 5; c++) {
		const ca = (c / 5) * Math.PI * 2;
		box(poleGroup, 0.15, 0.1, 0.15, '#64748b', Math.cos(ca) * 0.35, 0.05, Math.sin(ca) * 0.35);
	}

	// Tilted main pole section (bent at ~40 degrees from impact)
	const tiltedPole = new THREE.Group();
	tiltedPole.position.set(0, 0.45, 0);
	tiltedPole.rotation.z = -0.65; // Lean toward car
	tiltedPole.rotation.x = 0.15;
	cylinder(tiltedPole, 0.12, 0.15, 4.2, '#64748b', 0, 2.1, 0, 8);

	// Cross-arms and electrical insulators
	box(tiltedPole, 1.2, 0.08, 0.1, '#334155', 0, 3.8, 0);
	for (const ix of [-0.5, 0, 0.5]) {
		cylinder(tiltedPole, 0.04, 0.06, 0.22, '#cbd5e1', ix, 3.95, 0, 6);
	}

	// Dangling snapped electric wires
	const wire = cylinder(tiltedPole, 0.015, 0.015, 1.8, '#1e293b', 0.5, 3.0, 0.2, 4);
	wire.rotation.z = 0.3;

	// Spark particle emitter at wire tip
	const sparkSphere = sphere(tiltedPole, 0.08, '#38bdf8', 0.8, 2.1, 0.2, 6);

	poleGroup.add(tiltedPole);
	g.add(poleGroup);

	// ── 2. BLACK MAHINDRA THAR 4x4 SUV ─────────────────────────────────────
	const thar = new THREE.Group();
	thar.position.set(-0.5, 0, 0.1);
	thar.rotation.y = 0.35; // Angled as if swerved off road into pole

	const bodyColor = '#111827'; // Metallic Black
	const trimColor = '#1f2937'; // Matte black cladding
	const glassColor = '#0f172a'; // Deep tinted privacy glass

	// Heavy off-road chassis and front skid plate
	box(thar, 1.8, 0.25, 3.4, '#1e293b', 0, 0.38, 0);

	// Chunky Front Bumper crumpled into the pole
	const bumper = box(thar, 1.9, 0.35, 0.35, '#111827', 0, 0.42, 1.72);
	bumper.rotation.y = -0.15; // Crumpled angle from impact
	// Front tow hooks and fog lights
	cylinder(thar, 0.06, 0.06, 0.08, '#e2e8f0', -0.55, 0.42, 1.88, 6).rotation.x = Math.PI / 2;
	cylinder(thar, 0.06, 0.06, 0.08, '#e2e8f0',  0.55, 0.42, 1.88, 6).rotation.x = Math.PI / 2;

	// Main boxy body tub
	box(thar, 1.82, 0.7, 3.2, bodyColor, 0, 0.85, -0.05);

	// Flared Wheel Arches (Fenders)
	for (const wx of [-0.98, 0.98]) {
		box(thar, 0.22, 0.35, 0.9, trimColor, wx, 0.62, 1.0);  // Front
		box(thar, 0.22, 0.35, 0.9, trimColor, wx, 0.62, -1.0); // Rear
	}

	// 4 Massive Knobby Off-Road Tires
	for (const z of [-1.0, 1.0]) {
		for (const x of [-0.88, 0.88]) {
			const wheel = cylinder(thar, 0.42, 0.42, 0.3, '#1c1917', x, 0.42, z, 14);
			wheel.rotation.z = Math.PI / 2;
			// Silver alloy 5-spoke hub
			cylinder(thar, 0.22, 0.22, 0.32, '#64748b', x, 0.42, z, 8).rotation.z = Math.PI / 2;
		}
	}

	// Signature 7-Slot Front Grille
	box(thar, 1.1, 0.38, 0.08, '#374151', 0, 0.9, 1.6);
	for (let s = -3; s <= 3; s++) {
		box(thar, 0.045, 0.26, 0.09, '#111827', s * 0.14, 0.9, 1.61);
	}
	// Classic Round Headlights (one cracked, one glowing warm yellow)
	sphere(thar, 0.12, '#fef08a', -0.65, 0.92, 1.6, 8); // driver headlight glowing
	sphere(thar, 0.11, '#64748b',  0.65, 0.92, 1.6, 6); // smashed impact headlight

	// Hood / Bonnet (slightly crumpled up from crash)
	const hood = box(thar, 1.5, 0.12, 1.25, bodyColor, 0, 1.24, 0.98);
	hood.rotation.x = -0.12; // Buckled hood

	// Cabin with upright windshield and roll cage
	box(thar, 1.7, 0.8, 1.85, bodyColor, 0, 1.55, -0.45);
	// Upright Windshield
	box(thar, 1.55, 0.65, 0.08, glassColor, 0, 1.55, 0.42);
	// Side windows
	for (const sx of [-0.86, 0.86]) {
		box(thar, 0.06, 0.55, 1.5, glassColor, sx, 1.6, -0.45);
	}

	// Rear-Mounted Full-Size Spare Wheel (Signature Thar feature!)
	const spare = cylinder(thar, 0.38, 0.38, 0.24, '#1c1917', 0, 0.95, -1.78, 12);
	spare.rotation.x = Math.PI / 2;
	cylinder(thar, 0.2, 0.2, 0.26, '#64748b', 0, 0.95, -1.78, 8).rotation.x = Math.PI / 2;

	// Roof rack with auxiliary luggage
	box(thar, 1.4, 0.08, 1.6, '#334155', 0, 2.05, -0.45);
	box(thar, 0.7, 0.25, 0.9, '#b45309', -0.2, 2.2, -0.4);

	// Hazard warning blinkers (animated in update)
	const hazardL = sphere(thar, 0.06, '#f97316', -0.85, 0.85, 1.55, 6);
	const hazardR = sphere(thar, 0.06, '#f97316',  0.85, 0.85, 1.55, 6);

	g.add(thar);

	// ── 3. BANGALORE ONLOOKERS & UNCLE CROWD ──────────────────────────────
	const crowdGroup = new THREE.Group();

	interface Person {
		root: THREE.Group;
		armL: THREE.Object3D;
		armR: THREE.Object3D;
		baseY: number;
		phase: number;
	}
	const people: Person[] = [];

	function makePerson(x: number, z: number, facing: number, shirt: string, pants: string, kind: 'uncle' | 'auto' | 'phone' | 'techie') {
		const p = new THREE.Group();
		p.position.set(x, 0, z);
		p.rotation.y = facing;

		// Legs
		cylinder(p, 0.08, 0.08, 0.55, pants, -0.1, 0.275, 0, 6);
		cylinder(p, 0.08, 0.08, 0.55, pants,  0.1, 0.275, 0, 6);
		// Torso
		cylinder(p, 0.22, 0.22, 0.55, shirt, 0, 0.8, 0, 8);
		// Head & hair
		sphere(p, 0.2, '#f2cdab', 0, 1.25, 0, 10);
		sphere(p, 0.21, '#1e293b', 0, 1.32, -0.04, 8).scale.set(1, 0.6, 1);

		// Arms with expressive poses
		const armL = new THREE.Group();
		armL.position.set(-0.28, 0.95, 0);
		cylinder(armL, 0.06, 0.06, 0.45, shirt, 0, -0.22, 0, 6);
		p.add(armL);

		const armR = new THREE.Group();
		armR.position.set(0.28, 0.95, 0);
		cylinder(armR, 0.06, 0.06, 0.45, shirt, 0, -0.22, 0, 6);
		p.add(armR);

		if (kind === 'uncle') {
			// Hands on head in shock ("Ayyo!")
			armL.rotation.z = 2.4;
			armR.rotation.z = -2.4;
			// Spectacles
			box(p, 0.22, 0.04, 0.04, '#0f172a', 0, 1.26, 0.18);
		} else if (kind === 'auto') {
			// Auto driver with khaki uniform, pointing at the bumper
			armR.rotation.x = -1.3;
			armR.rotation.z = -0.3;
		} else if (kind === 'phone') {
			// Recording video on phone
			armL.rotation.x = -1.2;
			armR.rotation.x = -1.2;
			box(armR, 0.08, 0.14, 0.02, '#0f172a', 0, -0.35, 0.2); // smartphone
		} else if (kind === 'techie') {
			// Phone against ear
			armR.rotation.z = -2.1;
			armR.rotation.y = 0.5;
			box(armR, 0.06, 0.12, 0.02, '#1e293b', 0, -0.2, 0.15);
		}

		crowdGroup.add(p);
		people.push({ root: p, armL, armR, baseY: 0, phase: Math.random() * 10 });
	}

	// Add the 4 crowd members gathered around the crashed Thar
	makePerson(-1.8, 1.2, 0.9, '#ffffff', '#1e293b', 'uncle');   // Senior uncle
	makePerson( 1.6, 1.4, -1.8, '#b45309', '#78350f', 'auto');    // Auto driver in khaki
	makePerson(-1.4, -1.5, 2.2, '#ef4444', '#1e293b', 'phone');   // Guy filming reel
	makePerson( 1.8, -0.8, -2.4, '#2563eb', '#334155', 'techie');  // Techie on call

	g.add(crowdGroup);

	// ── 4. SPEECH CHATTER DIALOGUES ───────────────────────────────────────
	const CHATTER_LINES = [
		'Senior Uncle: Ayyo swamy! Look at this Thar driving on the footpath!',
		'Auto Anna: Bro thought he was off-roading in Nandi Hills macha!',
		'College Boy: Wait da, let me take a video for Bangalore Traffic Memes!',
		'Techie: Saar, don\'t go near the pole! Live 11kV wires are sparking!'
	];

	let chatterTimer = 0;
	let chatterIndex = 0;

	return {
		group: g,
		update(elapsed: number, dt: number) {
			// Hazard warning lights blink (once every 0.6 seconds)
			const blink = Math.sin(elapsed * 8) > 0;
			hazardL.visible = blink;
			hazardR.visible = blink;

			// Sparking electrical wire flashes
			sparkSphere.visible = Math.sin(elapsed * 24 + Math.cos(elapsed * 40)) > 0.4;

			// Idle crowd body gestures and head bobs
			chatterTimer += dt;
			if (chatterTimer > 3.8) {
				chatterTimer = 0;
				chatterIndex = (chatterIndex + 1) % CHATTER_LINES.length;
			}

			people.forEach((p, i) => {
				const sway = Math.sin(elapsed * 3 + p.phase) * 0.04;
				p.root.rotation.y += sway * 0.02;
				p.root.position.y = Math.abs(Math.sin(elapsed * 2.5 + p.phase)) * 0.03;
			});
		},
		getChatter(playerPos: THREE.Vector3) {
			const d = g.position.distanceTo(playerPos);
			if (d < 5.8) {
				return CHATTER_LINES[chatterIndex];
			}
			return null;
		}
	};
}
