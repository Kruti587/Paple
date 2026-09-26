import * as THREE from 'three';
import { PALETTE } from './constants';
import { box, cylinder, sphere } from './props/util';

export interface Character {
	group: THREE.Group;
	/** Swing pivots, animated while walking. */
	legs: THREE.Object3D[];
	arms: THREE.Object3D[];
}

interface Style {
	shirt: string;
	pants: string;
	skin?: string;
	hair?: string;
	decorate?: (g: THREE.Group) => void;
}

function limb(parent: THREE.Object3D, x: number, y: number, len: number, r: number, color: string) {
	const pivot = new THREE.Group();
	pivot.position.set(x, y, 0);
	parent.add(pivot);
	cylinder(pivot, r, r, len, color, 0, -len / 2, 0, 6);
	return pivot;
}

/** Chunky little figure (~1.4 m), faces +Z. */
function createFigure(style: Style): Character {
	const g = new THREE.Group();
	const skin = style.skin ?? PALETTE.skin;
	const legs = [
		limb(g, -0.1, 0.5, 0.5, 0.08, style.pants),
		limb(g, 0.1, 0.5, 0.5, 0.08, style.pants)
	];
	cylinder(g, 0.2, 0.25, 0.55, style.shirt, 0, 0.78, 0, 10);
	sphere(g, 0.2, style.shirt, 0, 1.03, 0, 10).scale.y = 0.5;
	const arms = [
		limb(g, -0.3, 1.0, 0.45, 0.065, style.shirt),
		limb(g, 0.3, 1.0, 0.45, 0.065, style.shirt)
	];
	arms[0].rotation.z = -0.15;
	arms[1].rotation.z = 0.15;
	sphere(g, 0.21, skin, 0, 1.3, 0, 12);
	if (style.hair) sphere(g, 0.215, style.hair, 0, 1.36, -0.03, 12).scale.set(1, 0.75, 1);
	for (const x of [-0.075, 0.075]) sphere(g, 0.03, '#222', x, 1.32, 0.19, 6);
	style.decorate?.(g);
	return { group: g, legs, arms };
}

export function createPlayer(): Character {
	return createFigure({
		shirt: '#e07a4f',
		pants: '#3c5a7a',
		hair: '#2b2320',
		decorate: (g) => {
			// Cap + messenger satchel
			cylinder(g, 0.22, 0.22, 0.1, '#2f6f8f', 0, 1.46, 0, 12);
			box(g, 0.3, 0.04, 0.2, '#2f6f8f', 0, 1.43, 0.2);
			box(g, 0.3, 0.26, 0.12, '#8b5e3c', -0.28, 0.72, 0.05);
			const strap = box(g, 0.05, 0.7, 0.05, '#6d4a2e', 0, 0.98, 0.21);
			strap.rotation.z = 0.7;
		}
	});
}

const NPC_STYLES: Record<string, Style> = {
	alien: {
		shirt: '#b9a5d6',
		pants: '#6d5a99',
		skin: '#8fd16a',
		decorate: (g) => {
			for (const s of [-1, 1]) {
				const a = cylinder(g, 0.015, 0.015, 0.3, '#8fd16a', s * 0.1, 1.6, 0, 5);
				a.rotation.z = -s * 0.3;
				sphere(g, 0.05, '#f5d547', s * 0.15, 1.75, 0, 6);
			}
			for (const x of [-0.08, 0.08]) sphere(g, 0.06, '#1b1b1b', x, 1.33, 0.17, 8);
		}
	},
	chef: {
		shirt: '#f4f1ea',
		pants: '#3a3a3a',
		hair: '#2b2320',
		decorate: (g) => {
			cylinder(g, 0.18, 0.16, 0.25, '#ffffff', 0, 1.55, 0, 10);
			sphere(g, 0.24, '#ffffff', 0, 1.72, 0, 10).scale.y = 0.6;
			box(g, 0.36, 0.45, 0.05, '#e8e0cf', 0, 0.72, 0.23);
		}
	},
	caveman: {
		shirt: '#9b6b3f',
		pants: '#7a5230',
		hair: '#3b2a1e',
		decorate: (g) => {
			sphere(g, 0.24, '#3b2a1e', 0, 1.42, -0.05, 8).scale.set(1.15, 0.8, 1.1);
			sphere(g, 0.12, '#3b2a1e', 0, 1.18, 0.14, 8).scale.set(1.2, 1, 0.6);
			const club = cylinder(g, 0.09, 0.04, 0.7, '#8b6a4a', 0.42, 0.75, 0.15, 6);
			club.rotation.x = 0.4;
		}
	},
	diver: {
		shirt: '#f07c3a',
		pants: '#2f4f6f',
		hair: '#2b2320',
		decorate: (g) => {
			box(g, 0.34, 0.12, 0.08, '#5fb3d1', 0, 1.34, 0.18);
			cylinder(g, 0.02, 0.02, 0.35, '#f5d547', 0.2, 1.4, 0.05, 5);
			cylinder(g, 0.1, 0.1, 0.45, '#9aa3a8', 0, 0.8, -0.3, 10);
		}
	},
	musician: {
		shirt: '#8e5bb5',
		pants: '#f2ede1',
		hair: '#2b2320',
		decorate: (g) => {
			// Mridangam slung in front
			const drum = cylinder(g, 0.13, 0.13, 0.55, '#8b5e3c', 0, 0.75, 0.3, 12);
			drum.rotation.z = Math.PI / 2;
			for (const x of [-0.28, 0.28]) {
				const head = cylinder(g, 0.12, 0.12, 0.02, '#e8dcc0', x, 0.75, 0.3, 12);
				head.rotation.z = Math.PI / 2;
			}
		}
	}
};

export function createNpcCharacter(npcId: string): Character {
	return createFigure(NPC_STYLES[npcId] ?? { shirt: '#cccccc', pants: '#555555' });
}

/** Simple walk cycle / idle sway. */
export function animateCharacter(c: Character, phase: number, amount: number) {
	const swing = Math.sin(phase) * 0.6 * amount;
	c.legs[0].rotation.x = swing;
	c.legs[1].rotation.x = -swing;
	c.arms[0].rotation.x = -swing * 0.8;
	c.arms[1].rotation.x = swing * 0.8;
}
