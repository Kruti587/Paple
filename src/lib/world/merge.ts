import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Bakes every mesh under `root` into world space and merges them per material.
 * Hundreds of props become a handful of draw calls (important: the outline pass renders the scene twice).
 */
export function mergeStatic(root: THREE.Object3D): THREE.Group {
	root.updateMatrixWorld(true);
	const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();

	root.traverse((o) => {
		const mesh = o as THREE.Mesh;
		if (!mesh.isMesh) return;
		const material = mesh.material as THREE.Material;
		// Normalise attribute layout so everything can merge: non-indexed, position + normal only.
		const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
		for (const name of Object.keys(geo.attributes)) {
			if (name !== 'position' && name !== 'normal') geo.deleteAttribute(name);
		}
		if (!geo.attributes.normal) geo.computeVertexNormals();
		geo.applyMatrix4(mesh.matrixWorld);
		const list = buckets.get(material) ?? [];
		list.push(geo);
		buckets.set(material, list);
	});

	const merged = new THREE.Group();
	merged.name = 'static';
	buckets.forEach((geos, material) => {
		const geo = mergeGeometries(geos);
		geos.forEach((g) => g.dispose());
		if (!geo) return;
		const mesh = new THREE.Mesh(geo, material);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		merged.add(mesh);
	});
	return merged;
}
