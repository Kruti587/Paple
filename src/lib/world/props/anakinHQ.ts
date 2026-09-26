import * as THREE from 'three';
import { PALETTE } from '../constants';
import { GLOW_LAYER } from '../outlinePass';
import type { Building } from './buildings';
import { COMPANY_NAME, textPanel } from './signs';
import { box, cylinder } from './util';

export const BRAND = '#6d4bd8';
const GLASS = '#5fb4c9';
const GLASS_DARK = '#3e8ea6';
const PANEL = '#f4f1ea';
const FLOOR_H = 2.5;
const FLOORS = 4; // G + 3

export interface AnakinHQ {
	building: Building;
	/** Rooftop sign + logo: textured, so kept out of the static merge (placed separately). */
	sign: THREE.Group;
	/** Distance from the building centre to the front door (m, along +Z). */
	doorOffset: number;
}

/** The quest building: a four-storey glass office with a big rooftop sign, facing +Z. */
export function createAnakinHQ(): AnakinHQ {
	const g = new THREE.Group();
	const width = 7.4;
	const depth = 5.4;
	const front = depth / 2;
	const h = FLOORS * FLOOR_H;

	box(g, width + 0.3, 0.3, depth + 0.3, PALETTE.stoneShade, 0, 0.15, 0);
	// Glass body with solid corner piers in brand-accented white panels
	box(g, width - 0.4, h, depth - 0.4, GLASS, 0, 0.3 + h / 2, 0);
	for (const x of [-1, 1])
		for (const z of [-1, 1]) {
			box(
				g,
				0.7,
				h + 0.2,
				0.7,
				PANEL,
				x * (width / 2 - 0.35),
				0.3 + (h + 0.2) / 2,
				z * (front - 0.35)
			);
			box(g, 0.72, h * 0.8, 0.12, BRAND, x * (width / 2 - 0.35), 0.3 + h * 0.5, z * (front - 0.29));
		}
	// Floor bands and vertical mullions across the curtain wall
	for (let f = 1; f <= FLOORS; f++)
		box(g, width - 0.3, 0.22, depth - 0.3, PANEL, 0, 0.3 + f * FLOOR_H - 0.11, 0);
	for (let i = 1; i < 7; i++) {
		const x = -width / 2 + 0.7 + i * ((width - 1.4) / 7);
		box(g, 0.08, h, 0.08, GLASS_DARK, x, 0.3 + h / 2, front - 0.18);
	}
	// Entrance: steps, canopy, glass doors
	box(g, 2.6, 0.12, 0.9, PALETTE.stoneShade, 0, 0.06, front + 0.45);
	box(g, 3.0, 0.12, 1.4, PANEL, 0, 2.55, front + 0.5);
	box(g, 1.8, 2.1, 0.08, GLASS_DARK, 0, 1.35, front - 0.14);
	box(g, 0.06, 2.1, 0.1, PANEL, 0, 1.35, front - 0.1);
	for (const x of [-1.35, 1.35]) cylinder(g, 0.06, 0.06, 2.3, PANEL, x, 1.4, front + 1.1, 8);
	// Roof parapet + plant room
	box(g, width, 0.5, 0.15, PANEL, 0, 0.3 + h + 0.25, front - 0.08);
	box(g, width, 0.5, 0.15, PANEL, 0, 0.3 + h + 0.25, -front + 0.08);
	box(g, 2.4, 1.2, 1.8, PANEL, 1.6, 0.3 + h + 0.6, -0.9);

	// Rooftop sign and a logo over the entrance (unlit so they read day and night)
	const sign = new THREE.Group();
	const frame = new THREE.Mesh(
		new THREE.BoxGeometry(6.2, 1.5, 0.12),
		new THREE.MeshBasicMaterial({ color: BRAND })
	);
	frame.position.set(0, 0.3 + h + 1.6, front - 0.3);
	sign.add(frame);
	const letters = textPanel(COMPANY_NAME, 5.8, 1.2, { color: '#ffffff', resolution: 110 });
	letters.position.set(0, 0.3 + h + 1.6, front - 0.23);
	sign.add(letters);
	for (const x of [-2.2, 2.2]) {
		const leg = new THREE.Mesh(
			new THREE.BoxGeometry(0.1, 1.0, 0.1),
			new THREE.MeshBasicMaterial({ color: '#44475a' })
		);
		leg.position.set(x, 0.3 + h + 0.55, front - 0.35);
		sign.add(leg);
	}
	const entranceSign = textPanel(COMPANY_NAME, 2.2, 0.35, {
		color: '#ffffff',
		background: BRAND,
		radius: 12,
		resolution: 160
	});
	entranceSign.position.set(0, 2.85, front + 1.21);
	sign.add(entranceSign);

	return { building: { group: g, width, depth: depth + 1.4 }, sign, doorOffset: front + 0.2 };
}

/** Street terminal a few steps from the entrance: pedestal and an angled screen showing a prompt. */
export function createKiosk(): { group: THREE.Group; screen: THREE.Object3D } {
	const g = new THREE.Group();
	box(g, 0.5, 0.1, 0.4, PALETTE.kerbBlack, 0, 0.05, 0);
	box(g, 0.28, 1.0, 0.24, '#3b3f4a', 0, 0.55, 0);
	const head = new THREE.Group();
	head.position.set(0, 1.12, 0.02);
	head.rotation.x = -0.45;
	g.add(head);
	box(head, 0.62, 0.44, 0.1, BRAND, 0, 0, 0);
	const screen = textPanel('>_', 0.52, 0.34, {
		color: '#39ff88',
		background: '#07130c',
		font: 'monospace',
		resolution: 300
	});
	screen.position.z = 0.056;
	head.add(screen);
	return { group: g, screen };
}

/** Floating quest beacon: a spinning diamond over a soft light pillar (glow layer, no outlines). */
export function createQuestMarker(): { group: THREE.Group; update(t: number): void } {
	const group = new THREE.Group();
	const pillar = new THREE.Mesh(
		new THREE.CylinderGeometry(0.35, 0.35, 14, 16, 1, true),
		new THREE.MeshBasicMaterial({
			color: new THREE.Color(BRAND).multiplyScalar(0.55),
			blending: THREE.AdditiveBlending,
			transparent: true,
			depthWrite: false,
			side: THREE.DoubleSide
		})
	);
	pillar.position.y = 7;
	pillar.layers.set(GLOW_LAYER);
	group.add(pillar);
	const diamond = new THREE.Mesh(
		new THREE.OctahedronGeometry(0.45),
		new THREE.MeshToonMaterial({ color: '#ffd84a', emissive: '#ffb300', emissiveIntensity: 0.6 })
	);
	diamond.scale.y = 1.5;
	group.add(diamond);
	return {
		group,
		update(t) {
			diamond.position.y = 4.4 + Math.sin(t * 2.2) * 0.25; // above the entrance canopy + sign
			diamond.rotation.y = t * 1.6;
		}
	};
}
