import * as THREE from 'three';
import { PALETTE } from '../constants';
import { blob, cylinder, range, sphere } from './util';

export type TreeKind = 'rain' | 'jacaranda' | 'gulmohar' | 'tabebuia' | 'palm';

export interface Tree {
	group: THREE.Group;
	/** Trunk collision radius. */
	radius: number;
	/** Canopy footprint, for spacing and flower carpets. */
	canopy: number;
}

const CANOPY: Record<Exclude<TreeKind, 'palm'>, string[]> = {
	rain: [PALETTE.rainTree, PALETTE.rainTreeLight],
	jacaranda: [PALETTE.jacaranda, PALETTE.jacaranda, PALETTE.rainTreeLight],
	gulmohar: [PALETTE.gulmohar, PALETTE.gulmohar, PALETTE.rainTree],
	tabebuia: [PALETTE.tabebuia, PALETTE.tabebuia, PALETTE.rainTreeLight]
};

export function createTree(kind: TreeKind, rand: () => number): Tree {
	return kind === 'palm' ? createPalm(rand) : createBroadleaf(kind, rand);
}

function createBroadleaf(kind: Exclude<TreeKind, 'palm'>, rand: () => number): Tree {
	const g = new THREE.Group();
	const scale = kind === 'rain' ? range(rand, 1.2, 1.5) : range(rand, 0.85, 1.15);
	const h = 2.2 * scale;
	cylinder(g, 0.1 * scale, 0.2 * scale, h, PALETTE.trunk, 0, h / 2, 0, 6);
	// Two splayed branches
	for (const s of [-1, 1]) {
		const b = cylinder(
			g,
			0.05 * scale,
			0.09 * scale,
			1.1 * scale,
			PALETTE.trunk,
			s * 0.3 * scale,
			h + 0.3 * scale,
			0,
			5
		);
		b.rotation.z = -s * 0.6;
	}
	const colors = CANOPY[kind];
	const spread = kind === 'rain' ? 1.5 : 1.1;
	const n = 5 + Math.floor(rand() * 3);
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2 + rand();
		const r = (i === 0 ? 0 : range(rand, 0.5, 1)) * spread * scale;
		const c = blob(
			g,
			range(rand, 0.6, 0.9) * scale * (kind === 'rain' ? 1.2 : 1),
			colors[i % colors.length],
			Math.cos(a) * r,
			h + range(rand, 0.4, 0.9) * scale,
			Math.sin(a) * r
		);
		c.scale.y = kind === 'rain' ? 0.6 : 0.8;
		c.rotation.y = rand() * Math.PI;
	}
	// Fallen blossom petals carpeting the ground around the tree trunk
	if (kind !== 'rain') {
		const petalCol = colors[0];
		for (let p = 0; p < 16; p++) {
			const pa = rand() * Math.PI * 2;
			const pr = range(rand, 0.35, spread * scale * 1.05);
			const petal = blob(g, range(rand, 0.06, 0.12), petalCol, Math.cos(pa) * pr, 0.02, Math.sin(pa) * pr);
			petal.scale.y = 0.25;
		}
	}
	return { group: g, radius: 0.3 * scale, canopy: (spread + 0.8) * scale };
}

function createPalm(rand: () => number): Tree {
	const g = new THREE.Group();
	const segments = 6;
	const lean = range(rand, 0.04, 0.1);
	const p = new THREE.Vector3();
	for (let i = 0; i < segments; i++) {
		const seg = cylinder(
			g,
			0.1,
			0.13,
			0.75,
			i % 2 ? PALETTE.trunk : PALETTE.coconut,
			p.x,
			p.y + 0.37,
			0,
			6
		);
		seg.rotation.z = -lean * (i + 1) * 0.5;
		p.x += Math.sin(lean * (i + 1) * 0.5) * 0.75;
		p.y += 0.72;
	}
	const top = p.clone();
	const fronds = 8;
	for (let i = 0; i < fronds; i++) {
		const pivot = new THREE.Group();
		pivot.position.copy(top);
		pivot.rotation.y = (i / fronds) * Math.PI * 2 + rand() * 0.3;
		g.add(pivot);
		const droop = new THREE.Group();
		droop.rotation.z = -0.35 - rand() * 0.35;
		pivot.add(droop);
		const frond = blob(droop, 1, PALETTE.palmLeaf, 0.9, 0, 0);
		frond.scale.set(1.0, 0.07, 0.25);
	}
	for (let i = 0; i < 3; i++) {
		const a = (i / 3) * Math.PI * 2;
		sphere(
			g,
			0.11,
			PALETTE.coconut,
			top.x + Math.cos(a) * 0.15,
			top.y - 0.15,
			Math.sin(a) * 0.15,
			6
		);
	}
	return { group: g, radius: 0.25, canopy: 1.6 };
}

/** Stone "katte" platform around a big tree — a classic Bengaluru neighbourhood hangout. */
export function createTreeKatte(rand: () => number): Tree {
	const tree = createBroadleaf('rain', rand);
	cylinder(tree.group, 1.3, 1.4, 0.45, PALETTE.stoneShade, 0, 0.22, 0, 16);
	cylinder(tree.group, 1.15, 1.15, 0.06, PALETTE.stone, 0, 0.47, 0, 16);
	return { group: tree.group, radius: 1.4, canopy: tree.canopy };
}
