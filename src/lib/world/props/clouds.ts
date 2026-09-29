import * as THREE from 'three';
import { PLANET_RADIUS } from '../constants';
import { blob, range } from './util';
import { randomUnitVector } from '../sphere';

export interface Clouds {
	group: THREE.Group;
	update(dt: number): void;
}

/**
 * Realistic layered cumulus clouds drifting across the Bangalore sky.
 * Formed with shadowed gray-blue flat undersides, billowing brilliant white domes,
 * and wispy trailing edges across multiple altitude strata.
 */
export function createClouds(rand: () => number, count = 26): Clouds {
	const group = new THREE.Group();
	const orbits: { pivot: THREE.Object3D; axis: THREE.Vector3; speed: number }[] = [];

	const cloudUnderBase = '#94a3b8'; // Shaded darker underside of cumulus
	const cloudMidShade = '#e2e8f0';  // Soft transitional shadow
	const cloudDomeWhite = '#ffffff'; // Sunlit billowing puffy cloud crowns
	const cloudRimWhite = '#f1f5f9';  // Wispy edge puffs

	for (let i = 0; i < count; i++) {
		const pivot = new THREE.Group();
		const axis = randomUnitVector(rand);
		const cloud = new THREE.Group();

		// Two altitude strata: lower heavy cumulus and upper gentle stratocumulus
		const isUpperLayer = i % 3 === 0;
		const altitude = isUpperLayer
			? PLANET_RADIUS + range(rand, 28, 36)
			: PLANET_RADIUS + range(rand, 18, 25);

		const clusterPuffs = isUpperLayer
			? 4 + Math.floor(rand() * 3)
			: 6 + Math.floor(rand() * 5);

		const cloudScale = isUpperLayer ? range(rand, 1.4, 2.2) : range(rand, 1.8, 3.2);

		// 1. Darker shaded flat underside base of the cumulus cloud
		const baseCount = Math.max(3, Math.floor(clusterPuffs * 0.6));
		for (let b = 0; b < baseCount; b++) {
			const bx = (b - baseCount / 2) * 1.1 * cloudScale;
			const bz = range(rand, -0.6, 0.6) * cloudScale;
			const baseMesh = blob(
				cloud,
				range(rand, 0.9, 1.5) * cloudScale,
				cloudUnderBase,
				bx,
				-0.3 * cloudScale,
				bz
			);
			baseMesh.scale.set(1.4, 0.35, 1.2);
			baseMesh.castShadow = false;
		}

		// 2. Billowing bright white dome crowns on top
		for (let p = 0; p < clusterPuffs; p++) {
			const px = (p - clusterPuffs / 2) * 0.95 * cloudScale + range(rand, -0.3, 0.3);
			const pz = range(rand, -0.7, 0.7) * cloudScale;
			const py = range(rand, 0.1, 0.8) * cloudScale;
			const puffRadius = range(rand, 1.0, 1.8) * cloudScale;
			const domeMesh = blob(
				cloud,
				puffRadius,
				rand() < 0.25 ? cloudMidShade : cloudDomeWhite,
				px,
				py,
				pz
			);
			// Slightly flatten into natural anvil/cumulus dome shape
			domeMesh.scale.set(1.15, 0.75, 1.1);
			domeMesh.castShadow = false;
		}

		// 3. Wispy periphery fringe puffs
		for (let w = 0; w < 3; w++) {
			const wx = (rand() < 0.5 ? -1 : 1) * (clusterPuffs * 0.55 * cloudScale + range(rand, 0.4, 1.0));
			const wz = range(rand, -0.5, 0.5) * cloudScale;
			const wy = range(rand, -0.1, 0.3) * cloudScale;
			const wisp = blob(cloud, range(rand, 0.5, 0.8) * cloudScale, cloudRimWhite, wx, wy, wz);
			wisp.scale.set(1.3, 0.45, 1.1);
			wisp.castShadow = false;
		}

		// Any direction perpendicular to the orbit axis
		const start = new THREE.Vector3(1, 0, 0).cross(axis);
		if (start.lengthSq() < 0.01) start.set(0, 1, 0).cross(axis);
		start.normalize();
		cloud.position.copy(start).multiplyScalar(altitude);
		cloud.lookAt(0, 0, 0);

		pivot.add(cloud);
		pivot.quaternion.setFromAxisAngle(axis, rand() * Math.PI * 2);
		group.add(pivot);

		const orbitSpeed = (isUpperLayer ? range(rand, 0.006, 0.012) : range(rand, 0.012, 0.022)) * (rand() < 0.5 ? -1 : 1);
		orbits.push({ pivot, axis, speed: orbitSpeed });
	}

	const q = new THREE.Quaternion();
	return {
		group,
		update(dt) {
			for (const o of orbits)
				o.pivot.quaternion.premultiply(q.setFromAxisAngle(o.axis, o.speed * dt));
		}
	};
}
