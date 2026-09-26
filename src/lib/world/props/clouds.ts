import * as THREE from 'three';
import { PALETTE, PLANET_RADIUS } from '../constants';
import { blob, range } from './util';
import { randomUnitVector } from '../sphere';

export interface Clouds {
	group: THREE.Group;
	update(dt: number): void;
}

/** Puffy clouds drifting around the planet on slow tilted orbits. */
export function createClouds(rand: () => number, count = 10): Clouds {
	const group = new THREE.Group();
	const orbits: { pivot: THREE.Object3D; axis: THREE.Vector3; speed: number }[] = [];

	for (let i = 0; i < count; i++) {
		const pivot = new THREE.Group();
		const axis = randomUnitVector(rand);
		const cloud = new THREE.Group();
		const puffs = 3 + Math.floor(rand() * 3);
		for (let p = 0; p < puffs; p++) {
			const b = blob(
				cloud,
				range(rand, 0.8, 1.4),
				PALETTE.cloud,
				(p - puffs / 2) * 0.9,
				range(rand, -0.2, 0.4),
				range(rand, -0.4, 0.4)
			);
			b.scale.y = 0.7;
			b.castShadow = false;
		}
		// Any direction perpendicular to the orbit axis.
		const start = new THREE.Vector3(1, 0, 0).cross(axis);
		if (start.lengthSq() < 0.01) start.set(0, 1, 0).cross(axis);
		start.normalize();
		cloud.position.copy(start).multiplyScalar(PLANET_RADIUS + range(rand, 9, 13));
		cloud.lookAt(0, 0, 0);
		pivot.add(cloud);
		pivot.quaternion.setFromAxisAngle(axis, rand() * Math.PI * 2);
		group.add(pivot);
		orbits.push({ pivot, axis, speed: range(rand, 0.01, 0.025) * (rand() < 0.5 ? -1 : 1) });
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
