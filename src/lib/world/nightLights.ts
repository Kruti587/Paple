import * as THREE from 'three';
import { PALETTE, PLANET_RADIUS } from './constants';
import { toon } from './materials';
import { GLOW_LAYER } from './outlinePass';

const WARM = new THREE.Color('#ffc46b');

/**
 * Night-time glow: lit windows, street-lamp heads and vehicle lights via emissive materials,
 * plus additive light pools on the ground and halos round the lamps (colour-only, no outlines).
 */
export class NightLights {
	readonly group = new THREE.Group();
	private readonly poolMaterial = new THREE.MeshBasicMaterial({
		vertexColors: true,
		blending: THREE.AdditiveBlending,
		transparent: true,
		depthWrite: false
	});
	private readonly haloMaterial = new THREE.MeshBasicMaterial({
		vertexColors: true,
		blending: THREE.AdditiveBlending,
		transparent: true,
		depthWrite: false
	});

	constructor() {
		// Emissive colours are fixed; intensity follows the night factor.
		toon(PALETTE.windowLit).emissive.copy(WARM);
		toon(PALETTE.lampHead).emissive.set('#ffe2a0');
		toon(PALETTE.headlight).emissive.set('#fff3c4');
		toon(PALETTE.tailLight).emissive.set('#ff3b3b');
		this.set(0);
	}

	/** A soft pool of lamplight on the ground centred on unit direction `up`. */
	addPool(up: THREE.Vector3, radius = 2.2) {
		const r = PLANET_RADIUS + 0.075; // just above the road surface
		const geo = new THREE.SphereGeometry(r, 24, 6, 0, Math.PI * 2, 0, radius / PLANET_RADIUS);
		const pos = geo.attributes.position;
		const colors = new Float32Array(pos.count * 3);
		const c = new THREE.Color();
		for (let i = 0; i < pos.count; i++) {
			// Distance from the cap's pole, 0 (centre) … 1 (rim); additive, so black = no light.
			const t = Math.acos(THREE.MathUtils.clamp(pos.getY(i) / r, -1, 1)) / (radius / PLANET_RADIUS);
			c.copy(WARM).multiplyScalar(Math.pow(Math.max(0, 1 - t), 2));
			c.toArray(colors, i * 3);
		}
		geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
		const mesh = new THREE.Mesh(geo, this.poolMaterial);
		mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
		this.add(mesh);
	}

	/** A glowing halo around a light source at world position `p`. */
	addHalo(p: THREE.Vector3, radius = 0.45) {
		const geo = new THREE.SphereGeometry(radius, 12, 8);
		const pos = geo.attributes.position;
		const colors = new Float32Array(pos.count * 3);
		// Brighter towards the top so it reads as a lamp, not a ball.
		for (let i = 0; i < pos.count; i++) {
			const k = 0.35 + 0.35 * (pos.getY(i) / radius + 1) * 0.5;
			WARM.clone()
				.multiplyScalar(k)
				.toArray(colors, i * 3);
		}
		geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
		const mesh = new THREE.Mesh(geo, this.haloMaterial);
		mesh.position.copy(p);
		this.add(mesh);
	}

	private add(mesh: THREE.Mesh) {
		mesh.layers.set(GLOW_LAYER);
		mesh.renderOrder = 10;
		this.group.add(mesh);
	}

	/** night: 0 = day … 1 = full night. */
	set(night: number) {
		const n = THREE.MathUtils.smoothstep(night, 0.15, 0.8);
		toon(PALETTE.windowLit).emissiveIntensity = n * 0.95;
		toon(PALETTE.lampHead).emissiveIntensity = n * 1.2;
		toon(PALETTE.headlight).emissiveIntensity = n * 1.2;
		toon(PALETTE.tailLight).emissiveIntensity = n * 0.8;
		this.poolMaterial.color.setScalar(n * 0.55);
		this.haloMaterial.color.setScalar(n * 0.5);
		this.group.visible = n > 0.001;
	}

	dispose() {
		this.group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
		this.poolMaterial.dispose();
		this.haloMaterial.dispose();
	}
}
