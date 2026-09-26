import * as THREE from 'three';
import {
	animateCharacter,
	createPlayer,
	createStaffer,
	type Character
} from '$lib/world/characters';
import type { MoveInput } from '$lib/world/input';
import { toon } from '$lib/world/materials';
import { GLOW_LAYER } from '$lib/world/outlinePass';
import { BRAND } from '$lib/world/props/anakinHQ';
import { COMPANY_NAME, textPanel } from '$lib/world/props/signs';

// A flat, cutaway interior of the ANAKIN HQ. Floor plate: x ∈ [-6, 6], z ∈ [-4.5, 4.5];
// the camera looks in from the +z side (where the entrance is). Floors: 0 = G … 3.

export const FLOOR_NAMES = ['G', '1', '2', '3'];
export const TOP_FLOOR = 3;

export type Zone = 'stairsUp' | 'stairsDown' | 'exit' | 'elevator' | 'fridge' | null;

interface Box2 {
	minX: number;
	maxX: number;
	minZ: number;
	maxZ: number;
}

const HALF_W = 6;
const HALF_D = 4.5;
const WALL_H = 2.8;
const LOW_WALL = 0.55;
const PLAYER_RADIUS = 0.3;
const WALK = 3.2;
const RUN = 6;

// Trigger rectangles (shared by every floor that has them).
const UP_ZONE: Box2 = { minX: -5.85, maxX: -4.75, minZ: -3.1, maxZ: -1.75 };
const DOWN_ZONE: Box2 = { minX: -4.55, maxX: -3.45, minZ: -3.1, maxZ: -1.75 };
const ELEVATOR_ZONE: Box2 = { minX: -3.2, maxX: -1.6, minZ: -4.35, maxZ: -3.25 };
const EXIT_ZONE: Box2 = { minX: -0.95, maxX: 0.95, minZ: 3.85, maxZ: 5 };
const FRIDGE_FRONT = new THREE.Vector2(3.85, -3.15);
export const LANDING = new THREE.Vector2(-4.5, -0.9);
export const ENTRANCE = new THREE.Vector2(0, 3.1);
/** Where the post-it's owner sits (and starts the chase from). */
export const STAFFER_SEAT = new THREE.Vector2(0.9, -0.2);

const inside = (b: Box2, x: number, z: number) =>
	x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;

export class Interior {
	readonly scene = new THREE.Scene();
	readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
	readonly player: Character;
	readonly chaser: Character;
	/** Player position on the floor plate. */
	readonly pos = new THREE.Vector2();
	floor = 0;

	private facing = Math.PI; // radians around +Y; PI = facing -z (into the building)
	private walkPhase = 0;
	private walkAmount = 0;
	private readonly floors: THREE.Group[] = [];
	private readonly colliders: Box2[][] = [];
	private readonly postIt: THREE.Group;
	private readonly seatedStaffer: Character;
	private readonly camPos = new THREE.Vector3();
	private camReady = false;

	constructor(code: string) {
		this.camera.layers.enable(GLOW_LAYER);
		this.scene.add(new THREE.AmbientLight('#fff4e6', 1.35));
		const key = new THREE.DirectionalLight('#ffffff', 1.7);
		key.position.set(5, 11, 8);
		key.castShadow = true;
		key.shadow.mapSize.set(2048, 2048);
		Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
		key.shadow.bias = -0.0008;
		key.shadow.intensity = 0.5;
		this.scene.add(key);

		for (let f = 0; f <= TOP_FLOOR; f++) {
			const { group, colliders } = buildFloor(f);
			group.visible = false;
			this.scene.add(group);
			this.floors.push(group);
			this.colliders.push(colliders);
		}

		this.postIt = createPostIt(code);
		this.postIt.position.set(3.7, 1.35, -3.57);
		this.floors[TOP_FLOOR].add(this.postIt);

		// The post-it's owner, having lunch with their back to the fridge.
		this.seatedStaffer = createStaffer();
		sit(this.seatedStaffer);
		this.seatedStaffer.group.position.set(STAFFER_SEAT.x, 0, STAFFER_SEAT.y);
		this.seatedStaffer.group.rotation.y = -Math.PI / 2;
		this.floors[TOP_FLOOR].add(this.seatedStaffer.group);

		this.player = createPlayer();
		this.player.group.traverse((o) => (o.castShadow = true));
		this.scene.add(this.player.group);

		this.chaser = createStaffer();
		this.chaser.group.traverse((o) => (o.castShadow = true));
		this.chaser.group.visible = false;
		this.scene.add(this.chaser.group);
	}

	enter(floor: number, at: 'entrance' | 'landing') {
		this.floors.forEach((g, i) => (g.visible = i === floor));
		this.floor = floor;
		const p = at === 'entrance' ? ENTRANCE : LANDING;
		this.pos.copy(p);
		this.facing = at === 'entrance' ? Math.PI : 0;
		this.camReady = false;
		this.place();
	}

	/** Post-it on the fridge (true) or already stolen (false). The owner sits only while it's there. */
	setPostItOnFridge(on: boolean) {
		this.postIt.visible = on;
		this.seatedStaffer.group.visible = on;
	}

	/** Position the chaser on this floor (null hides it). */
	setChaser(
		state: { x: number; z: number; heading: number; moving: boolean; phase: number } | null
	) {
		this.chaser.group.visible = !!state;
		if (!state) return;
		this.chaser.group.position.set(state.x, 0, state.z);
		this.chaser.group.rotation.y = state.heading;
		animateCharacter(this.chaser, state.phase, state.moving ? 1 : 0);
	}

	zone(): Zone {
		const { x, y: z } = this.pos;
		if (this.floor < TOP_FLOOR && inside(UP_ZONE, x, z)) return 'stairsUp';
		if (this.floor > 0 && inside(DOWN_ZONE, x, z)) return 'stairsDown';
		if (this.floor === 0 && inside(EXIT_ZONE, x, z)) return 'exit';
		if (inside(ELEVATOR_ZONE, x, z)) return 'elevator';
		if (this.floor === TOP_FLOOR && this.postIt.visible && this.pos.distanceTo(FRIDGE_FRONT) < 1.3)
			return 'fridge';
		return null;
	}

	update(dt: number, input: MoveInput, active: boolean, elapsed: number) {
		const moveX = active ? input.x : 0;
		const moveZ = active ? -input.z : 0; // camera looks towards -z, so "forward" is -z
		const moving = moveX * moveX + moveZ * moveZ > 0.01;
		if (moving) {
			const len = Math.hypot(moveX, moveZ);
			const speed = (input.run ? RUN : WALK) * dt;
			this.pos.x += (moveX / len) * speed;
			this.pos.y += (moveZ / len) * speed;
			this.collide();
			const target = Math.atan2(moveX, moveZ);
			let d = target - this.facing;
			d = Math.atan2(Math.sin(d), Math.cos(d));
			this.facing += d * (1 - Math.exp(-dt * 12));
		}
		this.walkAmount = THREE.MathUtils.lerp(this.walkAmount, moving ? 1 : 0, 1 - Math.exp(-dt * 10));
		this.walkPhase += dt * (input.run ? 14 : 10) * this.walkAmount;
		animateCharacter(this.player, this.walkPhase, this.walkAmount);
		this.place();

		// Seated staffer idles; the post-it glints.
		animateCharacter(this.seatedStaffer, elapsed * 1.2, 0.05);
		sit(this.seatedStaffer);
		const glint = this.postIt.getObjectByName('glint');
		if (glint) {
			glint.rotation.z = elapsed * 2;
			glint.scale.setScalar(0.8 + Math.sin(elapsed * 5) * 0.25);
		}

		// Camera: fixed three-quarter view that drifts with the player to keep the floor framed.
		const want = new THREE.Vector3(this.pos.x * 0.6, 8.8, this.pos.y * 0.45 + 7.6);
		if (!this.camReady) {
			this.camPos.copy(want);
			this.camReady = true;
		}
		this.camPos.lerp(want, 1 - Math.exp(-dt * 5));
		this.camera.position.copy(this.camPos);
		this.camera.lookAt(this.camPos.x, 0.3, this.camPos.z - 7.9);
	}

	resize(width: number, height: number) {
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
	}

	private place() {
		this.player.group.position.set(this.pos.x, 0, this.pos.y);
		this.player.group.rotation.y = this.facing;
	}

	private collide() {
		const p = this.pos;
		for (let pass = 0; pass < 2; pass++) {
			for (const b of this.colliders[this.floor]) {
				const cx = THREE.MathUtils.clamp(p.x, b.minX, b.maxX);
				const cz = THREE.MathUtils.clamp(p.y, b.minZ, b.maxZ);
				const dx = p.x - cx;
				const dz = p.y - cz;
				const d2 = dx * dx + dz * dz;
				if (d2 >= PLAYER_RADIUS * PLAYER_RADIUS) continue;
				if (d2 > 1e-8) {
					const d = Math.sqrt(d2);
					p.x = cx + (dx / d) * PLAYER_RADIUS;
					p.y = cz + (dz / d) * PLAYER_RADIUS;
				} else {
					// Centre inside the box: push out along the shallowest axis.
					const pushes = [p.x - b.minX, b.maxX - p.x, p.y - b.minZ, b.maxZ - p.y];
					const i = pushes.indexOf(Math.min(...pushes));
					if (i === 0) p.x = b.minX - PLAYER_RADIUS;
					else if (i === 1) p.x = b.maxX + PLAYER_RADIUS;
					else if (i === 2) p.y = b.minZ - PLAYER_RADIUS;
					else p.y = b.maxZ + PLAYER_RADIUS;
				}
			}
		}
		p.x = THREE.MathUtils.clamp(p.x, -HALF_W + 0.35, HALF_W - 0.35);
		p.y = THREE.MathUtils.clamp(p.y, -HALF_D + 0.35, HALF_D + 0.6);
	}

	dispose() {
		this.scene.traverse((o) => {
			const m = o as THREE.Mesh;
			if (m.isMesh) m.geometry.dispose();
		});
	}
}

// --- Building blocks -----------------------------------------------------------------------

type Color = THREE.ColorRepresentation;

/** Box at (x, y, z) — y is the box's bottom, not its centre. Optionally solid. */
function block(
	parent: THREE.Object3D,
	colliders: Box2[] | null,
	w: number,
	h: number,
	d: number,
	color: Color,
	x: number,
	y: number,
	z: number
): THREE.Mesh {
	const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
	mesh.position.set(x, y + h / 2, z);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	parent.add(mesh);
	colliders?.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
	return mesh;
}

function wallSign(
	parent: THREE.Object3D,
	text: string,
	w: number,
	h: number,
	x: number,
	y: number,
	z: number,
	opts = {}
) {
	const panel = textPanel(text, w, h, { color: '#2f3440', resolution: 140, ...opts });
	panel.position.set(x, y, z);
	parent.add(panel);
	return panel;
}

function plant(parent: THREE.Object3D, colliders: Box2[], x: number, z: number) {
	block(parent, colliders, 0.45, 0.45, 0.45, '#b5543a', x, 0, z);
	const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), toon('#4f8f45'));
	leaves.geometry.computeVertexNormals();
	leaves.position.set(x, 0.85, z);
	leaves.scale.y = 1.2;
	leaves.castShadow = true;
	parent.add(leaves);
}

function chair(parent: THREE.Object3D, x: number, z: number, rot: number, color = '#3b3f4a') {
	const g = new THREE.Group();
	g.position.set(x, 0, z);
	g.rotation.y = rot;
	parent.add(g);
	block(g, null, 0.45, 0.08, 0.45, color, 0, 0.42, 0);
	block(g, null, 0.45, 0.5, 0.07, color, 0, 0.5, -0.2);
	block(g, null, 0.06, 0.42, 0.06, '#222', 0, 0, 0);
}

function desk(parent: THREE.Object3D, colliders: Box2[], x: number, z: number) {
	block(parent, colliders, 1.5, 0.08, 0.75, '#e8e2d6', x, 0.72, z);
	for (const dx of [-0.68, 0.68]) block(parent, null, 0.06, 0.72, 0.65, '#9aa3a8', x + dx, 0, z);
	block(parent, null, 0.55, 0.36, 0.04, '#23262d', x, 0.95, z - 0.2);
	block(parent, null, 0.08, 0.16, 0.06, '#23262d', x, 0.8, z - 0.2);
	block(parent, null, 0.4, 0.02, 0.14, '#555', x, 0.8, z + 0.1);
	const screen = new THREE.Mesh(
		new THREE.PlaneGeometry(0.5, 0.3),
		new THREE.MeshBasicMaterial({ color: '#7ad0e6' })
	);
	screen.position.set(x, 1.13, z - 0.177);
	parent.add(screen);
	chair(parent, x, z + 0.65, Math.PI);
}

/** Walls, stairwell, elevator and floor label shared by every floor. */
function buildShell(g: THREE.Group, colliders: Box2[], floor: number) {
	const floorColors = ['#e9dfcf', '#cfd8dc', '#d9cfc7', '#f0e6d2'];
	const wall = '#f4f1ea';
	block(g, null, HALF_W * 2 + 0.4, 0.2, HALF_D * 2 + 0.4, floorColors[floor], 0, -0.2, 0);
	// Back and side walls full height; front wall low (cutaway, camera side).
	block(g, colliders, HALF_W * 2 + 0.4, WALL_H, 0.2, wall, 0, 0, -HALF_D - 0.1);
	block(g, colliders, 0.2, WALL_H, HALF_D * 2, wall, -HALF_W - 0.1, 0, 0);
	block(g, colliders, 0.2, WALL_H, HALF_D * 2, wall, HALF_W + 0.1, 0, 0);
	block(g, null, HALF_W * 2 + 0.4, 0.3, 0.05, BRAND, 0, 2.2, -HALF_D + 0.03);
	if (floor === 0) {
		// Entrance gap in the front wall with glass door leaves pushed open.
		block(g, colliders, HALF_W - 0.95, LOW_WALL, 0.2, wall, -(HALF_W + 0.95) / 2, 0, HALF_D + 0.1);
		block(g, colliders, HALF_W - 0.95, LOW_WALL, 0.2, wall, (HALF_W + 0.95) / 2, 0, HALF_D + 0.1);
		for (const s of [-1, 1]) {
			const leaf = block(g, null, 0.9, 1.9, 0.05, '#9fd3dc', s * 1.3, 0, HALF_D + 0.35);
			leaf.rotation.y = s * 1.2;
		}
		block(g, null, 1.6, 0.02, 1.0, '#8b5e3c', 0, 0, HALF_D - 0.6);
	} else {
		block(g, colliders, HALF_W * 2, LOW_WALL, 0.2, wall, 0, 0, HALF_D + 0.1);
	}

	// Stairwell (north-west): up flight on the left, down flight on the right.
	block(g, colliders, 0.12, 1.0, 2.5, wall, -4.65, 0, -3.2);
	block(g, colliders, 0.2, 1.0, 2.9, wall, -3.3, 0, -3.05);
	if (floor < TOP_FLOOR) {
		for (let i = 0; i < 7; i++)
			block(g, null, 1.08, 0.18 * (i + 1), 0.36, '#c7bea9', -5.3, 0, -1.98 - i * 0.36);
		wallSign(g, '▲ UP', 1.05, 0.35, -5.3, 1.9, -HALF_D + 0.02, { color: BRAND });
	} else {
		// Roof access locked.
		block(g, colliders, 1.1, 1.0, 0.08, '#9aa3a8', -5.3, 0, -2.0);
		wallSign(g, 'ROOF\nLOCKED', 1.0, 0.5, -5.3, 1.6, -HALF_D + 0.02, { color: '#c0392b' });
	}
	if (floor > 0) {
		for (let i = 0; i < 7; i++) {
			const shade = new THREE.Color('#9aa0a8').lerp(new THREE.Color('#2a2c33'), i / 6);
			block(g, null, 1.08, 0.02, 0.36, shade, -4.0, 0, -1.98 - i * 0.36);
		}
		wallSign(g, '▼ DOWN', 1.05, 0.35, -4.0, 1.9, -HALF_D + 0.02, { color: BRAND });
	} else {
		plant(g, colliders, -4.0, -3.9);
	}

	// Broken elevator
	block(g, null, 1.5, 2.3, 0.1, '#8f979f', -2.4, 0, -HALF_D + 0.05);
	for (const s of [-1, 1])
		block(g, null, 0.62, 2.1, 0.06, '#c3cad1', -2.4 + s * 0.33, 0, -HALF_D + 0.12);
	for (const s of [-1, 1]) {
		const tape = block(g, null, 1.5, 0.12, 0.02, '#f5d547', -2.4, 1.0, -HALF_D + 0.17);
		tape.rotation.z = s * 0.7;
	}
	wallSign(g, 'OUT OF\nORDER', 1.1, 0.5, -2.4, 2.55, -HALF_D + 0.08, {
		color: '#ffffff',
		background: '#c0392b',
		radius: 10
	});
	const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 10), toon('#f07c3a'));
	cone.position.set(-1.7, 0.25, -3.6);
	g.add(cone);

	// Floor number, big on the back wall
	wallSign(g, `FLOOR ${FLOOR_NAMES[floor]}`, 1.8, 0.45, -0.3, 1.75, -HALF_D + 0.02);
}

function buildFloor(floor: number): { group: THREE.Group; colliders: Box2[] } {
	const g = new THREE.Group();
	const colliders: Box2[] = [];
	buildShell(g, colliders, floor);

	if (floor === 0) {
		// Reception
		block(g, colliders, 2.8, 1.05, 0.7, BRAND, 3.0, 0, 0.4);
		block(g, colliders, 0.7, 1.05, 1.6, BRAND, 4.05, 0, -0.35);
		block(g, null, 3.0, 0.06, 0.8, '#f4f1ea', 3.0, 1.05, 0.4);
		const deskLogo = textPanel(COMPANY_NAME, 1.4, 0.35, { color: '#ffffff', resolution: 160 });
		deskLogo.position.set(3.0, 0.6, 0.76);
		g.add(deskLogo);
		const receptionist = createStaffer();
		receptionist.group.position.set(3.0, 0, -0.35);
		g.add(receptionist.group);
		wallSign(g, COMPANY_NAME, 3.2, 0.8, 3.2, 1.55, -HALF_D + 0.03, {
			color: '#ffffff',
			background: BRAND,
			radius: 18
		});
		// Lobby sofas + coffee table + plants
		block(g, colliders, 2.2, 0.45, 0.8, '#e07a4f', -2.0, 0, 2.6);
		block(g, null, 2.2, 0.5, 0.2, '#c9653f', -2.0, 0.45, 2.9);
		block(g, colliders, 1.0, 0.4, 0.6, '#8b5e3c', -2.0, 0, 1.5);
		plant(g, colliders, 5.3, 3.8);
		plant(g, colliders, -5.3, 3.8);
		plant(g, colliders, 5.3, -3.9);
	} else if (floor === 1) {
		for (const x of [-1.6, 0.9, 3.4]) for (const z of [-2.4, -0.2, 2.0]) desk(g, colliders, x, z);
		block(g, colliders, 0.4, 1.2, 0.4, '#dfe6ea', 5.4, 0, 3.6);
		block(g, null, 0.3, 0.4, 0.3, '#7ad0e6', 5.4, 1.2, 3.6);
		wallSign(g, 'SHIP IT', 1.6, 0.45, 3.4, 1.7, -HALF_D + 0.03, { color: BRAND });
		plant(g, colliders, -5.3, 3.8);
		plant(g, colliders, 5.3, -3.9);
	} else if (floor === 2) {
		// Glass meeting room with a long table
		const glass = '#bfe3ea';
		block(g, colliders, 5.2, 1.1, 0.08, glass, 3.3, 0, 0.3);
		block(g, colliders, 0.08, 1.1, 3.4, glass, 0.7, 0, -1.4);
		block(g, colliders, 3.4, 0.08, 1.2, '#8b5e3c', 3.4, 0.72, -2.0);
		block(g, null, 0.2, 0.72, 0.8, '#5a3c26', 3.4, 0, -2.0);
		for (const x of [2.2, 3.0, 3.8, 4.6]) {
			chair(g, x, -2.85, 0);
			chair(g, x, -1.15, Math.PI);
		}
		const screen = textPanel('Q3 ROADMAP\n🚀 AGENTS', 2.2, 1.0, {
			color: '#ffffff',
			background: '#23262d',
			radius: 8
		});
		screen.position.set(3.4, 1.6, -HALF_D + 0.03);
		g.add(screen);
		// Lounge: bean bags
		for (const [x, z, c] of [
			[-2.2, 2.2, '#ef5da8'],
			[-0.8, 2.8, '#3fc1c9'],
			[-2.6, 3.4, '#f4d35e']
		] as [number, number, string][]) {
			const bag = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), toon(c));
			bag.scale.set(1, 0.6, 1);
			bag.position.set(x, 0.27, z);
			bag.castShadow = true;
			g.add(bag);
			colliders.push({ minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4 });
		}
		plant(g, colliders, 5.3, 3.8);
	} else {
		// Pantry: counter, coffee machine, fridge (with the post-it), table where the owner sits.
		block(g, colliders, 1.1, 0.95, 5.6, '#f4f1ea', 5.3, 0, -0.9);
		block(g, null, 1.2, 0.06, 5.7, '#3b3f4a', 5.3, 0.95, -0.9);
		block(g, null, 0.45, 0.55, 0.4, '#23262d', 5.3, 1.01, 0.8);
		block(g, null, 0.5, 0.05, 0.4, '#9aa3a8', 5.3, 1.01, -0.6);
		block(g, null, 0.9, 0.7, 5.6, '#e8e2d6', 5.5, 1.6, -0.9);
		// Fridge
		block(g, colliders, 1.1, 1.95, 0.8, '#e8ecef', 3.85, 0, -4.0);
		block(g, null, 1.12, 0.02, 0.82, '#aab2b8', 3.85, 1.3, -4.0);
		block(g, null, 0.04, 0.5, 0.05, '#9aa3a8', 4.25, 1.45, -3.58);
		block(g, null, 0.04, 0.35, 0.05, '#9aa3a8', 4.25, 0.85, -3.58);
		// Round table + stools
		const table = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 20), toon('#8b5e3c'));
		table.position.set(0, 0.74, -0.2);
		table.castShadow = true;
		g.add(table);
		block(g, null, 0.1, 0.72, 0.1, '#3b3f4a', 0, 0, -0.2);
		colliders.push({ minX: -0.65, maxX: 0.65, minZ: -0.85, maxZ: 0.45 });
		for (const [x, z] of [
			[-0.9, -0.2],
			[0, 0.7],
			[0, -1.1]
		])
			block(g, null, 0.35, 0.45, 0.35, '#f07c3a', x, 0, z);
		block(g, null, 0.35, 0.45, 0.35, '#f07c3a', STAFFER_SEAT.x, 0, STAFFER_SEAT.y);
		block(g, null, 0.26, 0.08, 0.26, '#ffffff', 0.3, 0.77, -0.2); // lunch plate
		wallSign(g, 'FUEL YOUR\nMODELS ☕', 1.6, 0.8, 1.95, 1.6, -HALF_D + 0.03, { color: BRAND });
		plant(g, colliders, -5.3, 3.8);
	}
	return { group: g, colliders };
}

/** The post-it: yellow square with the code scrawled on it, plus a pulsing glint. */
function createPostIt(code: string): THREE.Group {
	const g = new THREE.Group();
	const note = textPanel(`CODE\n${code}`, 0.2, 0.2, {
		color: '#1d2a6b',
		background: '#ffe066',
		font: '"Segoe Print", "Comic Sans MS", cursive',
		resolution: 900
	});
	g.add(note);
	const glint = new THREE.Mesh(
		new THREE.PlaneGeometry(0.5, 0.5),
		new THREE.MeshBasicMaterial({
			map: glintTexture(),
			blending: THREE.AdditiveBlending,
			transparent: true,
			depthWrite: false
		})
	);
	glint.name = 'glint';
	glint.position.z = 0.02;
	glint.layers.set(GLOW_LAYER);
	g.add(glint);
	return g;
}

function glintTexture(): THREE.Texture {
	const c = document.createElement('canvas');
	c.width = c.height = 64;
	const ctx = c.getContext('2d')!;
	const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
	grad.addColorStop(0, 'rgba(255,240,160,1)');
	grad.addColorStop(0.25, 'rgba(255,220,90,0.5)');
	grad.addColorStop(1, 'rgba(255,200,60,0)');
	ctx.fillStyle = grad;
	ctx.fillRect(0, 0, 64, 64);
	ctx.fillStyle = 'rgba(255,255,220,0.9)';
	ctx.fillRect(30, 4, 4, 56);
	ctx.fillRect(4, 30, 56, 4);
	const t = new THREE.CanvasTexture(c);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

/** Seated pose: thighs forward, lowered onto a stool. */
function sit(c: Character) {
	c.group.position.y = -0.05;
	for (const leg of c.legs) leg.rotation.x = -1.45;
}
