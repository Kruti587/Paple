import * as THREE from 'three';
import { PALETTE } from './constants';
import { box, cylinder, sphere } from './props/util';

export interface Character {
	group: THREE.Group;
	/** Swing pivots, animated while walking. */
	legs: THREE.Object3D[];
	arms: THREE.Object3D[];
	/** Cape segments for flowing animation (optional, only on caped characters). */
	capeSegments?: THREE.Object3D[];
}

interface Style {
	shirt: string;
	pants: string;
	skin?: string;
	hair?: string;
	decorate?: (
		g: THREE.Group,
		extra: { capeSegments?: THREE.Object3D[]; legs?: THREE.Object3D[] }
	) => void;
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
	const extraData: { capeSegments?: THREE.Object3D[]; legs?: THREE.Object3D[] } = { legs };
	style.decorate?.(g, extraData);
	return { group: g, legs, arms, ...extraData };
}

export function createPlayer(): Character {
	return createFigure({
		shirt: '#1a1a1a', // Dark black Jedi inner tunic
		pants: '#111111', // Black Jedi pants
		skin: '#e8b896', // Warm peach skin
		hair: '#6b3a2a', // Auburn-brown hair
		decorate: (g, extra) => {
			// ═══════════════════════════════════════════════════════
			// HAIR — Anakin's thick, wavy, swept-back auburn locks
			// ═══════════════════════════════════════════════════════
			// Main hair volume (back)
			sphere(g, 0.235, '#6b3a2a', 0, 1.43, -0.06, 12).scale.set(1.15, 0.88, 1.18);
			// Top crown — slightly lighter highlight
			sphere(g, 0.18, '#7a4433', 0, 1.48, -0.02, 10).scale.set(1.0, 0.55, 1.0);
			// Right swept wave
			sphere(g, 0.14, '#7a4433', 0.12, 1.44, -0.03, 8).scale.set(0.7, 0.65, 0.85);
			// Left swept wave
			sphere(g, 0.13, '#7a4433', -0.1, 1.43, -0.01, 8).scale.set(0.65, 0.6, 0.8);
			// Front fringe — sweeps across forehead
			sphere(g, 0.1, '#5e3322', 0.06, 1.4, 0.14, 8).scale.set(0.95, 0.4, 0.5);
			// Left fringe tendril
			sphere(g, 0.06, '#5e3322', -0.08, 1.38, 0.15, 6).scale.set(0.5, 0.35, 0.4);
			// Hair at nape of neck
			sphere(g, 0.14, '#5e3322', 0, 1.3, -0.16, 8).scale.set(1.0, 0.7, 0.6);
			// Side-burns / hair by ears
			box(g, 0.04, 0.1, 0.06, '#6b3a2a', -0.18, 1.32, 0.05);
			box(g, 0.04, 0.1, 0.06, '#6b3a2a', 0.18, 1.32, 0.05);

			// ═══════════════════════════════════════════════════════
			// FACE DETAILS — eyebrows, nose, mouth, ears, scar
			// ═══════════════════════════════════════════════════════
			// Eyebrows — dark, slightly angled (intense look)
			const browL = box(g, 0.05, 0.015, 0.02, '#3b2218', -0.075, 1.355, 0.2);
			browL.rotation.z = -0.15;
			const browR = box(g, 0.05, 0.015, 0.02, '#3b2218', 0.075, 1.355, 0.2);
			browR.rotation.z = 0.15;
			// Nose — small bump
			sphere(g, 0.025, '#daa882', 0, 1.29, 0.21, 6);
			// Mouth — thin line
			box(g, 0.045, 0.012, 0.01, '#c4806a', 0, 1.26, 0.2);
			// Ears
			sphere(g, 0.04, '#e8b896', -0.2, 1.31, 0.04, 6).scale.set(0.5, 0.8, 0.7);
			sphere(g, 0.04, '#e8b896', 0.2, 1.31, 0.04, 6).scale.set(0.5, 0.8, 0.7);
			// Anakin's scar — vertical over the right eye
			box(g, 0.015, 0.07, 0.015, '#c4806a', 0.075, 1.34, 0.2);

			// ═══════════════════════════════════════════════════════
			// TORSO — layered Jedi robes
			// ═══════════════════════════════════════════════════════
			// Outer tunic layer (very dark brown, sits over the black inner)
			cylinder(g, 0.22, 0.27, 0.5, '#1f1710', 0, 0.79, 0, 10);
			// Inner robe V-neckline visible at chest
			box(g, 0.08, 0.15, 0.04, '#2a1d12', 0, 0.95, 0.17);

			// Tabard left (brown leather fold over chest, angled)
			const tabardL = box(g, 0.13, 0.45, 0.05, '#3d2b1f', -0.07, 0.82, 0.16);
			tabardL.rotation.z = 0.18;
			// Tabard right
			const tabardR = box(g, 0.13, 0.45, 0.05, '#3d2b1f', 0.07, 0.82, 0.16);
			tabardR.rotation.z = -0.18;
			// Tabard overlap seam at centre
			box(g, 0.03, 0.35, 0.03, '#2a1d12', 0, 0.82, 0.19);

			// Shoulder pauldrons (subtle bulk on top of shoulders)
			sphere(g, 0.09, '#1f1710', -0.26, 1.04, 0, 6).scale.set(1.2, 0.6, 1.0);
			sphere(g, 0.09, '#1f1710', 0.26, 1.04, 0, 6).scale.set(1.2, 0.6, 1.0);

			// ═══════════════════════════════════════════════════════
			// ARMS — dark brown leather sleeves + glove detail
			// ═══════════════════════════════════════════════════════
			// Left arm sleeve (brown leather)
			cylinder(g, 0.082, 0.078, 0.36, '#3d2b1f', -0.3, 0.82, 0, 8);
			// Right arm sleeve (brown leather)
			cylinder(g, 0.082, 0.078, 0.36, '#3d2b1f', 0.3, 0.82, 0, 8);
			// Left hand — bare skin
			sphere(g, 0.045, '#e8b896', -0.3, 0.54, 0, 6);
			// Right hand — black leather glove (mechanical hand)
			sphere(g, 0.048, '#111111', 0.3, 0.54, 0, 6);
			// Glove wrist cuff
			cylinder(g, 0.055, 0.055, 0.04, '#222222', 0.3, 0.6, 0, 6);

			// ═══════════════════════════════════════════════════════
			// BELT — detailed utility belt with pouches & tools
			// ═══════════════════════════════════════════════════════
			// Main belt band
			box(g, 0.3, 0.065, 0.28, '#6b4226', 0, 0.56, 0.0);
			// Belt edge trim (top)
			box(g, 0.3, 0.015, 0.29, '#8b5a2e', 0, 0.595, 0.0);
			// Belt edge trim (bottom)
			box(g, 0.3, 0.015, 0.29, '#8b5a2e', 0, 0.525, 0.0);
			// Centre buckle — silver with inner detail
			box(g, 0.09, 0.055, 0.04, '#b0b0b0', 0, 0.56, 0.15);
			box(g, 0.05, 0.03, 0.02, '#d4d4d4', 0, 0.56, 0.17); // Inner buckle plate
			// Left pouch
			box(g, 0.055, 0.055, 0.045, '#5a3a1e', -0.12, 0.55, 0.13);
			box(g, 0.055, 0.01, 0.045, '#4a2e16', -0.12, 0.58, 0.13); // Pouch flap
			// Right pouch
			box(g, 0.055, 0.055, 0.045, '#5a3a1e', 0.12, 0.55, 0.13);
			box(g, 0.055, 0.01, 0.045, '#4a2e16', 0.12, 0.58, 0.13);
			// Small tool canister on left side
			cylinder(g, 0.018, 0.018, 0.08, '#7a7a7a', -0.16, 0.55, 0.0, 6);
			// Food capsule on right hip
			cylinder(g, 0.02, 0.02, 0.06, '#5a3a1e', 0.16, 0.54, -0.04, 6);
			// Rear belt box
			box(g, 0.07, 0.05, 0.04, '#5a3a1e', 0, 0.55, -0.14);

			// ═══════════════════════════════════════════════════════
			// BOOTS — attached to leg pivots so they animate together
			// Leg pivots are at y=0.5, so local coords are offset by -0.5
			// ═══════════════════════════════════════════════════════
			const leftLeg = extra.legs![0];
			const rightLeg = extra.legs![1];
			// Left boot upper (local: y = 0.22 - 0.5 = -0.28)
			cylinder(leftLeg, 0.09, 0.095, 0.2, '#1a1208', 0, -0.28, 0, 6);
			// Left boot sole (local: y = 0.02 - 0.5 = -0.48)
			box(leftLeg, 0.1, 0.03, 0.14, '#0d0d0d', 0, -0.48, 0.01);
			// Left boot strap (local: y = 0.18 - 0.5 = -0.32)
			box(leftLeg, 0.092, 0.015, 0.1, '#2a1d12', 0, -0.32, 0.0);
			// Right boot upper
			cylinder(rightLeg, 0.09, 0.095, 0.2, '#1a1208', 0, -0.28, 0, 6);
			// Right boot sole
			box(rightLeg, 0.1, 0.03, 0.14, '#0d0d0d', 0, -0.48, 0.01);
			// Right boot strap
			box(rightLeg, 0.092, 0.015, 0.1, '#2a1d12', 0, -0.32, 0.0);

			// ═══════════════════════════════════════════════════════
			// CAPE — multi-segment flowing Jedi cloak
			// Each segment is a child of the previous, so rotations
			// cascade down like a chain for natural cloth flow.
			// ═══════════════════════════════════════════════════════

			// Cape collar (static, stays on shoulders)
			box(g, 0.36, 0.07, 0.07, '#2a1d12', 0, 1.06, -0.14);
			// Collar clasp
			sphere(g, 0.025, '#8b8b8b', 0, 1.06, -0.1, 4);

			const CAPE_SEGMENTS = 5;
			const segHeight = 0.14;
			const capeSegments: THREE.Object3D[] = [];
			const capeColors = ['#1f1710', '#1c1510', '#191310', '#161110', '#130f0e'];

			let parent: THREE.Object3D = g;
			let firstSeg = true;
			for (let i = 0; i < CAPE_SEGMENTS; i++) {
				const pivot = new THREE.Group();
				if (firstSeg) {
					// First segment attaches at the upper back
					pivot.position.set(0, 1.02, -0.16);
					firstSeg = false;
				} else {
					// Subsequent segments chain below the previous
					pivot.position.set(0, -segHeight, 0);
				}
				parent.add(pivot);

				// Each segment gets slightly narrower towards the bottom
				const w = 0.38 - i * 0.02;
				const color = capeColors[i] ?? '#130f0e';
				box(pivot, w, segHeight, 0.035, color, 0, -segHeight / 2, 0);

				// Add a subtle edge/hem highlight on the last segment
				if (i === CAPE_SEGMENTS - 1) {
					box(pivot, w + 0.01, 0.015, 0.04, '#2a1d12', 0, -segHeight, 0);
				}

				capeSegments.push(pivot);
				parent = pivot;
			}

			extra.capeSegments = capeSegments;
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

/** Simple walk cycle / idle sway + flowing cape animation. */
export function animateCharacter(c: Character, phase: number, amount: number) {
	const swing = Math.sin(phase) * 0.6 * amount;
	c.legs[0].rotation.x = swing;
	c.legs[1].rotation.x = -swing;
	c.arms[0].rotation.x = -swing * 0.8;
	c.arms[1].rotation.x = swing * 0.8;

	// Cape flow animation — each segment swings with increasing delay
	if (c.capeSegments) {
		for (let i = 0; i < c.capeSegments.length; i++) {
			const seg = c.capeSegments[i];
			// Delayed wave: each segment lags behind the previous one
			const delay = i * 0.6;
			// Walking flow — swing follows leg motion with cascading delay
			const walkFlow = Math.sin(phase - delay) * 0.12 * amount;
			// Idle breeze — gentle ambient sway even when standing still
			const idleBreeze = Math.sin(phase * 0.3 - delay * 0.5) * 0.04 * (1 - amount);
			// Side sway for more natural look
			const sideWave = Math.sin(phase * 0.7 - delay * 0.8) * 0.03 * (0.3 + amount * 0.7);

			// Deeper segments swing more (amplify towards the bottom)
			const depthScale = 1 + i * 0.3;
			seg.rotation.x = (walkFlow + idleBreeze) * depthScale;
			seg.rotation.z = sideWave * depthScale;
		}
	}
}
