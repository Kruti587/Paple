import * as THREE from 'three';

const CLICK_TOLERANCE_PX = 5;

/** Walks up from a raycast hit (often a child mesh of a GLTF) to the NPC root tagged with userData.npcId. */
function findNpcId(object: THREE.Object3D | null): string | null {
	for (let o = object; o; o = o.parent) {
		if (typeof o.userData.npcId === 'string') return o.userData.npcId;
	}
	return null;
}

/**
 * Click/tap-to-pick against NPC objects. Ignores drags so OrbitControls keeps working.
 * Returns a dispose function.
 */
export function createNpcPicker(
	canvas: HTMLCanvasElement,
	camera: THREE.Camera,
	npcObjects: THREE.Object3D[],
	onPick: (npcId: string) => void
): () => void {
	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();
	let downX = 0;
	let downY = 0;

	const onDown = (e: PointerEvent) => {
		downX = e.clientX;
		downY = e.clientY;
	};

	const onUp = (e: PointerEvent) => {
		if (Math.hypot(e.clientX - downX, e.clientY - downY) > CLICK_TOLERANCE_PX) return;
		const rect = canvas.getBoundingClientRect();
		pointer.set(
			((e.clientX - rect.left) / rect.width) * 2 - 1,
			-((e.clientY - rect.top) / rect.height) * 2 + 1
		);
		raycaster.setFromCamera(pointer, camera);
		const hit = raycaster.intersectObjects(npcObjects, true)[0];
		const npcId = hit ? findNpcId(hit.object) : null;
		if (npcId) onPick(npcId);
	};

	canvas.addEventListener('pointerdown', onDown);
	canvas.addEventListener('pointerup', onUp);
	return () => {
		canvas.removeEventListener('pointerdown', onDown);
		canvas.removeEventListener('pointerup', onUp);
	};
}
