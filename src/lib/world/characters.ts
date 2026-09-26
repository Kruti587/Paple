import * as THREE from 'three';
import { PALETTE } from './constants';
import { textPanel, COMPANY_NAME } from './props/signs';
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
		shirt: '#4a3d69', // Dark sci-fi suit
		pants: '#322847',
		skin: '#8fd16a',
		decorate: (g) => {
			// Alien eyes (large, black, slanted)
			const eyeL = sphere(g, 0.08, '#111111', -0.09, 1.34, 0.16, 8);
			eyeL.scale.set(1.2, 0.7, 1);
			eyeL.rotation.z = -0.3;
			eyeL.rotation.y = 0.2;
			const eyeR = sphere(g, 0.08, '#111111', 0.09, 1.34, 0.16, 8);
			eyeR.scale.set(1.2, 0.7, 1);
			eyeR.rotation.z = 0.3;
			eyeR.rotation.y = -0.2;

			// Antennae
			for (const s of [-1, 1]) {
				const a = cylinder(g, 0.015, 0.015, 0.35, '#8fd16a', s * 0.12, 1.6, -0.05, 5);
				a.rotation.z = -s * 0.4;
				a.rotation.x = -0.1;
				// Glowing tips
				sphere(g, 0.05, '#55ff55', s * 0.18, 1.75, -0.07, 6);
			}

			// Sci-fi suit chest panel
			box(g, 0.25, 0.2, 0.05, '#222222', 0, 0.85, 0.2);
			// Glowing buttons on panel
			box(g, 0.04, 0.04, 0.02, '#ff3333', -0.06, 0.88, 0.22);
			box(g, 0.04, 0.04, 0.02, '#33ff33', 0, 0.88, 0.22);
			box(g, 0.04, 0.04, 0.02, '#3333ff', 0.06, 0.88, 0.22);
			box(g, 0.16, 0.02, 0.02, '#ffcc00', 0, 0.8, 0.22);

			// Metallic belt and buckle
			box(g, 0.42, 0.08, 0.42, '#555555', 0, 0.55, 0);
			box(g, 0.12, 0.1, 0.04, '#aaaaaa', 0, 0.55, 0.22);
		}
	},
	chef: {
		shirt: '#ffffff', // Clean white chef coat
		pants: '#111111', // Black/houndstooth pants
		skin: '#f2cdab',
		hair: '#3d2616', // Hidden under hat, but has a moustache
		decorate: (g) => {
			// Detailed Chef Hat (Toque)
			// Base band
			cylinder(g, 0.19, 0.19, 0.15, '#f8f8f8', 0, 1.48, 0, 12);
			// Puffy top (multiple overlapping spheres)
			sphere(g, 0.22, '#fcfcfc', 0, 1.68, 0, 10).scale.set(1.2, 0.8, 1.2);
			sphere(g, 0.18, '#fcfcfc', 0.15, 1.65, 0.1, 8);
			sphere(g, 0.18, '#fcfcfc', -0.15, 1.65, 0.1, 8);
			sphere(g, 0.18, '#fcfcfc', 0, 1.65, -0.15, 8);

			// Thick Moustache
			const stacheL = cylinder(g, 0.02, 0.01, 0.08, '#3d2616', -0.04, 1.27, 0.2, 6);
			stacheL.rotation.z = 1.2;
			stacheL.rotation.y = 0.4;
			const stacheR = cylinder(g, 0.02, 0.01, 0.08, '#3d2616', 0.04, 1.27, 0.2, 6);
			stacheR.rotation.z = -1.2;
			stacheR.rotation.y = -0.4;

			// Red Neckerchief
			box(g, 0.3, 0.08, 0.28, '#cc2222', 0, 1.05, 0);
			// Neckerchief knot/tails hanging down
			const tie1 = box(g, 0.05, 0.15, 0.03, '#cc2222', -0.04, 0.98, 0.15);
			tie1.rotation.z = 0.3;
			const tie2 = box(g, 0.05, 0.15, 0.03, '#cc2222', 0.04, 0.98, 0.15);
			tie2.rotation.z = -0.3;

			// Double-breasted jacket details (black buttons)
			for (let y = 0.65; y <= 0.95; y += 0.15) {
				sphere(g, 0.02, '#111111', -0.08, y, 0.21, 5).scale.z = 0.5;
				sphere(g, 0.02, '#111111', 0.08, y, 0.21, 5).scale.z = 0.5;
			}
			// Coat seam
			box(g, 0.01, 0.45, 0.02, '#dddddd', 0, 0.8, 0.2);

			// Frying pan in right hand
			// Handle
			const handle = cylinder(g, 0.015, 0.015, 0.25, '#222222', 0.35, 0.65, 0.2, 6);
			handle.rotation.x = -1.2;
			// Pan body
			const pan = cylinder(g, 0.18, 0.15, 0.04, '#333333', 0.35, 0.72, 0.38, 12);
			pan.rotation.x = -1.2;
			// Fried egg inside the pan!
			const eggWhite = cylinder(g, 0.06, 0.06, 0.01, '#ffffff', 0.33, 0.73, 0.38, 8);
			eggWhite.rotation.x = -1.2;
			const eggYolk = sphere(g, 0.025, '#ffcc00', 0.32, 0.74, 0.37, 6);
			eggYolk.rotation.x = -1.2;
		}
	},
	caveman: {
		shirt: '#a37048', // Animal pelt
		pants: '#5c3d26', // Loincloth/fur pants
		skin: '#d49b6c',
		hair: '#2a1a10',
		decorate: (g) => {
			// Wild, bushy hair
			sphere(g, 0.26, '#2a1a10', 0, 1.4, -0.05, 10).scale.set(1.15, 0.9, 1.1);
			sphere(g, 0.16, '#2a1a10', -0.15, 1.35, -0.05, 8).scale.set(1, 1.2, 1);
			sphere(g, 0.16, '#2a1a10', 0.15, 1.35, -0.05, 8).scale.set(1, 1.2, 1);
			sphere(g, 0.12, '#2a1a10', 0, 1.5, 0.05, 8); // Top tuft

			// Unibrow
			box(g, 0.18, 0.025, 0.03, '#2a1a10', 0, 1.36, 0.2);

			// Big bushy beard
			sphere(g, 0.18, '#2a1a10', 0, 1.2, 0.15, 8).scale.set(1.2, 1, 0.8);
			sphere(g, 0.12, '#2a1a10', -0.12, 1.22, 0.12, 6);
			sphere(g, 0.12, '#2a1a10', 0.12, 1.22, 0.12, 6);

			// Animal pelt details (one-shoulder strap)
			// Bare right shoulder/chest
			box(g, 0.18, 0.2, 0.05, '#d49b6c', 0.12, 0.95, 0.2);
			// Diagonal strap over left shoulder
			const strap = box(g, 0.1, 0.35, 0.05, '#4a2e16', -0.08, 0.95, 0.21);
			strap.rotation.z = -0.4;
			// Jagged pelt trim at the bottom
			for (let i = 0; i < 5; i++) {
				const trim = box(g, 0.08, 0.1, 0.04, '#a37048', -0.16 + i * 0.08, 0.5, 0.2);
				trim.rotation.z = i % 2 === 0 ? 0.2 : -0.2;
			}
			// Belt (rope/vine)
			cylinder(g, 0.21, 0.21, 0.04, '#7a964f', 0, 0.55, 0, 10);

			// Detailed Spiked Club in right hand
			const club = cylinder(g, 0.04, 0.02, 0.5, '#5c4028', 0.35, 0.65, 0.15, 6);
			club.rotation.x = 0.4;
			// Club head (thicker)
			const head = cylinder(g, 0.08, 0.06, 0.25, '#4a321e', 0.35, 0.8, 0.21, 6);
			head.rotation.x = 0.4;
			// Spikes on the club
			for (let i = 0; i < 4; i++) {
				const spike = cylinder(g, 0.01, 0.03, 0.1, '#a69f91', 0.35, 0.8, 0.21, 4);
				spike.rotation.x = 0.4;
				spike.rotation.z = (Math.PI / 2) * i;
				spike.rotation.y = Math.PI / 2;
			}
		}
	},
	diver: {
		shirt: '#1a1a1a', // Black wetsuit
		pants: '#1a1a1a',
		skin: '#e0ac82',
		decorate: (g, extra) => {
			// Orange wetsuit accents (vest area)
			cylinder(g, 0.21, 0.21, 0.4, '#e65c00', 0, 0.78, 0, 10);
			// Wetsuit zipper
			box(g, 0.015, 0.4, 0.02, '#333333', 0, 0.78, 0.21);

			// Scuba diving mask/visor
			// Mask frame
			box(g, 0.32, 0.16, 0.1, '#333333', 0, 1.34, 0.18);
			// Glass visor (cyan, slightly transparent looking via color)
			box(g, 0.28, 0.12, 0.04, '#4dd2ff', 0, 1.34, 0.22);
			// Mask strap around head
			box(g, 0.34, 0.06, 0.25, '#222222', 0, 1.34, -0.05);
			// Snorkel / Breathing apparatus in mouth
			box(g, 0.08, 0.06, 0.06, '#222222', 0, 1.22, 0.22);

			// Oxygen Tank on back
			// Tank body (Yellow)
			cylinder(g, 0.14, 0.14, 0.5, '#fce300', 0, 0.8, -0.3, 10);
			// Tank base
			cylinder(g, 0.145, 0.145, 0.05, '#333333', 0, 0.55, -0.3, 10);
			// Tank valve (silver)
			cylinder(g, 0.04, 0.04, 0.08, '#aaaaaa', 0, 1.08, -0.3, 6);
			// Hose connecting tank to mouth
			const hose = cylinder(g, 0.02, 0.02, 0.3, '#333333', 0.12, 1.15, -0.05, 6);
			hose.rotation.x = -0.8;
			hose.rotation.z = -0.5;

			// Weight belt
			box(g, 0.43, 0.06, 0.43, '#222222', 0, 0.55, 0);
			// Lead weights
			box(g, 0.08, 0.08, 0.04, '#888888', 0.15, 0.55, 0.22);
			box(g, 0.08, 0.08, 0.04, '#888888', -0.15, 0.55, 0.22);
			box(g, 0.08, 0.08, 0.04, '#888888', 0, 0.55, -0.22);

			// Flippers attached to legs
			if (extra.legs) {
				const leftLeg = extra.legs[0];
				const rightLeg = extra.legs[1];
				// Left flipper (local coords: y=0.5 is pivot, so -0.5 is ground)
				const flipL = box(leftLeg, 0.16, 0.03, 0.35, '#e65c00', 0, -0.48, 0.1);
				flipL.rotation.x = 0.1;
				// Right flipper
				const flipR = box(rightLeg, 0.16, 0.03, 0.35, '#e65c00', 0, -0.48, 0.1);
				flipR.rotation.x = 0.1;
			}

			// Flashlight in right hand
			cylinder(g, 0.02, 0.02, 0.15, '#222222', 0.3, 0.55, 0.15, 8); // Handle
			const bulb = cylinder(g, 0.04, 0.02, 0.08, '#dddddd', 0.3, 0.55, 0.25, 8); // Head
			bulb.rotation.x = Math.PI / 2;
			sphere(g, 0.03, '#ffffff', 0.3, 0.55, 0.28, 6); // Lens
			// Glow aura for light
			const auraMat = new THREE.MeshBasicMaterial({
				color: '#ffffff',
				transparent: true,
				opacity: 0.3
			});
			const aura = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), auraMat);
			aura.position.set(0.3, 0.55, 0.3);
			g.add(aura);
		}
	},
	musician: {
		shirt: '#e3cd96', // Golden-cream kurta
		pants: '#f5f0e1', // White dhoti
		skin: '#a66a42', // Rich brown skin
		hair: '#111111',
		decorate: (g) => {
			// Neat, slicked traditional hair
			sphere(g, 0.22, '#111111', 0, 1.4, -0.05, 10).scale.set(1.05, 0.85, 1.05);

			// Dhoti folds (adds volume to the pants)
			box(g, 0.35, 0.45, 0.25, '#f5f0e1', 0, 0.3, 0);
			// Gold border on dhoti (kasavu style)
			box(g, 0.36, 0.04, 0.26, '#d4af37', 0, 0.15, 0);

			// Angavastram (shawl) draped over left shoulder
			const shawl = box(g, 0.12, 0.55, 0.24, '#c93434', -0.14, 0.85, 0.05);
			shawl.rotation.z = 0.1;
			// Gold border on shawl
			const shawlBorder = box(g, 0.13, 0.04, 0.25, '#d4af37', -0.16, 0.6, 0.05);
			shawlBorder.rotation.z = 0.1;

			// Gold chain / necklace
			cylinder(g, 0.18, 0.18, 0.02, '#d4af37', 0, 1.05, 0.08, 8).rotation.x = 0.3;

			// ── Detailed Mridangam ──
			// Strapped across the front
			const drumStrap = cylinder(g, 0.18, 0.18, 0.02, '#3b2513', 0, 0.85, 0, 12);
			drumStrap.rotation.z = 0.6;
			drumStrap.rotation.x = -0.2;

			const mridangamGroup = new THREE.Group();
			mridangamGroup.position.set(0, 0.65, 0.25);
			mridangamGroup.rotation.z = Math.PI / 2 + 0.2;
			mridangamGroup.rotation.x = 0.2;
			g.add(mridangamGroup);

			// Wood body (tapered at both ends)
			// Left half
			cylinder(mridangamGroup, 0.12, 0.16, 0.25, '#754019', 0, -0.125, 0, 12);
			// Right half
			cylinder(mridangamGroup, 0.16, 0.11, 0.25, '#754019', 0, 0.125, 0, 12);

			// Leather straps (lacing) across the body
			for (let i = 0; i < 8; i++) {
				const lace = box(mridangamGroup, 0.015, 0.5, 0.015, '#221100', 0, 0, 0.16);
				lace.rotation.y = (Math.PI / 4) * i;
			}

			// Left drum head (thoppi - larger, plain leather)
			cylinder(mridangamGroup, 0.125, 0.125, 0.02, '#d4c3a3', 0, -0.25, 0, 12);
			// Right drum head (valanthalai - smaller, with black syahi)
			cylinder(mridangamGroup, 0.115, 0.115, 0.02, '#d4c3a3', 0, 0.25, 0, 12);
			// Syahi (black tuning circle on the right head)
			cylinder(mridangamGroup, 0.05, 0.05, 0.025, '#111111', 0, 0.25, 0, 12);

			// Hands resting on the drum heads
			sphere(g, 0.045, '#a66a42', -0.25, 0.75, 0.25, 6); // Left hand
			sphere(g, 0.045, '#a66a42', 0.25, 0.65, 0.35, 6); // Right hand
		}
	}
};

export function createNpcCharacter(npcId: string): Character {
	return createFigure(NPC_STYLES[npcId] ?? { shirt: '#cccccc', pants: '#555555' });
}

/** Staffer in a company T-shirt (with the logo on the chest) and an ID lanyard — the quest's chaser. */
export function createStaffer(): Character {
	return createFigure({
		shirt: '#6d4bd8',
		pants: '#2f3440',
		skin: '#b97a55',
		hair: '#1d1714',
		decorate: (g) => {
			const logo = textPanel(COMPANY_NAME, 0.36, 0.1, { color: '#ffffff', resolution: 400 });
			logo.position.set(0, 0.86, 0.255);
			g.add(logo);
			// Lanyard + ID card
			box(g, 0.02, 0.28, 0.02, '#f5d547', -0.08, 0.9, 0.24).rotation.z = -0.25;
			box(g, 0.02, 0.28, 0.02, '#f5d547', 0.08, 0.9, 0.24).rotation.z = 0.25;
			box(g, 0.1, 0.13, 0.015, '#ffffff', 0, 0.7, 0.26);
		}
	});
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
