import * as THREE from 'three';

let gradientMap: THREE.DataTexture | undefined;

/** 3-band ramp: shadow, mid, lit — the flat cel look. */
function getGradientMap(): THREE.DataTexture {
	if (!gradientMap) {
		gradientMap = new THREE.DataTexture(new Uint8Array([90, 175, 255]), 3, 1, THREE.RedFormat);
		gradientMap.minFilter = THREE.NearestFilter;
		gradientMap.magFilter = THREE.NearestFilter;
		gradientMap.generateMipmaps = false;
		gradientMap.needsUpdate = true;
	}
	return gradientMap;
}

const cache = new Map<string, THREE.MeshToonMaterial>();

/** Shared toon material per colour — sharing is what lets static props merge into few draw calls. */
export function toon(color: THREE.ColorRepresentation) {
	const key = new THREE.Color(color).getHexString();
	let mat = cache.get(key);
	if (!mat) {
		mat = new THREE.MeshToonMaterial({ color, gradientMap: getGradientMap() });
		cache.set(key, mat);
	}
	return mat;
}

export function vertexColorToon() {
	return new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: getGradientMap() });
}

export function disposeMaterials() {
	cache.forEach((m) => m.dispose());
	cache.clear();
	gradientMap?.dispose();
	gradientMap = undefined;
}
