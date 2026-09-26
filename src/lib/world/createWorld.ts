import * as THREE from 'three';
import { createNpcCharacter, createPlayer, animateCharacter, type Character } from './characters';
import { FOOTPATH_WIDTH, PALETTE, ROAD_HALF_WIDTH } from './constants';
import type { MoveInput } from './input';
import { Layout } from './layout';
import { disposeMaterials, toon } from './materials';
import { mergeStatic } from './merge';
import { OutlineRenderer } from './outlinePass';
import { createPlanet, type GroundPatch } from './planet';
import { PlayerController } from './player';
import { createGopuram, createHouse, createVidhanaSoudha, type Building } from './props/buildings';
import { createClouds } from './props/clouds';
import {
	createBench,
	createChaiStall,
	createCow,
	createElectricPole,
	createFruitCart,
	createRangoli,
	createStreetLamp,
	createTrafficUmbrella,
	createWires
} from './props/street';
import { createTree, createTreeKatte, type TreeKind } from './props/trees';
import { blob, pick, range, sphere } from './props/util';
import { createAuto, createScooter } from './props/vehicles';
import { buildRoadNetwork, Road, sphereCap } from './roads';
import { anyTangent, mulberry32, placeOnSurface, stepAlong, toTangent } from './sphere';

const TALK_DISTANCE = 2.4;
const ROAD_HEIGHT = 0.06;

export interface World {
	camera: THREE.PerspectiveCamera;
	player: PlayerController;
	/** Clickable NPC roots, each tagged with userData.npcId. */
	npcObjects: THREE.Object3D[];
	setAnimationLoop(callback: XRFrameRequestCallback | null): void;
	update(dt: number, elapsed: number, input: MoveInput): void;
	render(elapsed: number): void;
	resize(width: number, height: number): void;
	/** NPC within talking distance of the player, if any. */
	nearbyNpc(): string | null;
	dispose(): void;
}

interface Vehicle {
	object: THREE.Object3D;
	road: Road;
	u: number;
	speed: number;
	direction: 1 | -1;
	lane: number;
}

interface Npc {
	id: string;
	character: Character;
	up: THREE.Vector3;
	facing: THREE.Vector3;
	phase: number;
}

export function createWorld(canvas: HTMLCanvasElement, npcIds: string[]): World {
	const rand = mulberry32(20260926);

	// --- Renderer / scene ---------------------------------------------------
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

	scene.add(new THREE.AmbientLight(0xffffff, 1.35));
	const sun = new THREE.DirectionalLight(0xfff4e0, 2.1);
	sun.castShadow = true;
	sun.shadow.mapSize.set(2048, 2048);
	Object.assign(sun.shadow.camera, {
		left: -16,
		right: 16,
		top: 16,
		bottom: -16,
		near: 1,
		far: 70
	});
	sun.shadow.bias = -0.0006;
	sun.shadow.normalBias = 0.03;
	sun.shadow.intensity = 0.55;
	scene.add(sun, sun.target);

	// --- Roads & layout -----------------------------------------------------
	const roads = [
		new Road({ rotation: new THREE.Euler(0, 0, 0), amplitude: 0.22, frequency: 3, phase: 0.3 }),
		new Road({
			rotation: new THREE.Euler(Math.PI / 2, 0.6, 0.25),
			amplitude: 0.14,
			frequency: 2,
			phase: 1.1
		})
	];
	const [mainRoad, crossRoad] = roads;
	const staticRoot = new THREE.Group();
	const network = buildRoadNetwork(roads);
	staticRoot.add(network.group);

	const layout = new Layout(roads, rand);
	for (const j of network.junctions) layout.reserve(j, ROAD_HALF_WIDTH * 1.8, false);
	const patches: GroundPatch[] = [];

	const addStatic = (
		obj: THREE.Object3D,
		up: THREE.Vector3,
		forward: THREE.Vector3,
		height = 0
	) => {
		placeOnSurface(obj, up, forward, height);
		staticRoot.add(obj);
	};

	/** Stand a building beside a road, facing it. Returns false if the plot is taken. */
	const placeBuilding = (
		b: Building,
		road: Road,
		u: number,
		side: 1 | -1,
		setback = 0.3
	): boolean => {
		const offset = ROAD_HALF_WIDTH + FOOTPATH_WIDTH + b.depth / 2 + setback;
		const f = road.frameAt(u, side * offset);
		const facing = f.right.clone().multiplyScalar(-side);
		if (!layout.boxIsFree(f.up, facing, b.width, b.depth, FOOTPATH_WIDTH)) return false;
		addStatic(b.group, f.up, facing);
		layout.reserveBox(f.up, facing, b.width, b.depth);
		return true;
	};

	const placeLandmark = (b: Building, road: Road, u: number, side: 1 | -1, setback: number) => {
		for (let k = 0; k < 40; k++) if (placeBuilding(b, road, u + k * 0.013, side, setback)) return;
	};

	/** Small prop beside the road, `inset` metres from the kerb; faces the road unless `parallel`. */
	const placeOnFootpath = (
		obj: THREE.Object3D,
		road: Road,
		u: number,
		side: 1 | -1,
		radius: number,
		inset = 0.6,
		parallel = false
	) => {
		const f = road.frameAt(u, side * (ROAD_HALF_WIDTH + inset));
		if (!layout.isFree(f.up, radius, inset - radius - 0.05)) return null;
		addStatic(obj, f.up, parallel ? f.forward : f.right.clone().multiplyScalar(-side));
		layout.reserve(f.up, radius);
		return f;
	};

	// --- Landmarks ----------------------------------------------------------
	placeLandmark(createVidhanaSoudha(), mainRoad, 0.14, 1, 1.2);
	placeLandmark(createGopuram(), crossRoad, 0.32, -1, 0.8);

	// The start area: a busy junction on the main road.
	const junction = network.junctions[0] ?? mainRoad.samples[0];
	const jU = mainRoad.nearestU(junction);
	const jFrame = mainRoad.frameAt(jU);
	{
		// Traffic police umbrella on a junction corner (roads cross at an angle, so search for
		// the nearest spot that is clear of both carriageways).
		const guess = stepAlong(
			stepAlong(junction, jFrame.right, ROAD_HALF_WIDTH + 1.1),
			jFrame.forward,
			ROAD_HALF_WIDTH + 1.1
		);
		const corner = layout.findSpot(guess, 0.6, 0.2);
		if (corner) {
			addStatic(createTrafficUmbrella(), corner, jFrame.forward);
			layout.reserve(corner, 0.6);
		}
	}

	// Lake with a sandy bank, lily pads and lotus.
	const lakeDir = layout.findSpot(new THREE.Vector3(0.3, 0.2, -1).normalize(), 5.2, 1.5);
	if (lakeDir) {
		patches.push({ dir: lakeDir, radius: 5.6, color: PALETTE.sand });
		staticRoot.add(sphereCap(lakeDir, 4.4, 0.03, toon(PALETTE.water), 40));
		staticRoot.add(sphereCap(lakeDir, 2.6, 0.035, toon(PALETTE.waterLight), 32));
		for (let i = 0; i < 9; i++) {
			const t = anyTangent(lakeDir).applyAxisAngle(lakeDir, rand() * Math.PI * 2);
			const p = stepAlong(lakeDir, t, range(rand, 1.2, 3.8));
			const pad = new THREE.Group();
			const leaf = blob(pad, 0.3, '#5d9a4a', 0, 0, 0);
			leaf.scale.y = 0.08;
			if (rand() < 0.5) sphere(pad, 0.09, '#f3a3c0', 0, 0.06, 0, 6);
			addStatic(pad, p, t, 0.05);
		}
		layout.reserve(lakeDir, 5.2, true, 4.3);
	}

	// Cubbon-park-style grove with benches.
	const parkDir = layout.findSpot(new THREE.Vector3(-0.6, 0.7, 0.4).normalize(), 5, 1);
	if (parkDir) {
		patches.push({ dir: parkDir, radius: 5.5, color: PALETTE.grassDark });
		for (let i = 0; i < 9; i++) {
			const t = anyTangent(parkDir).applyAxisAngle(parkDir, (i / 9) * Math.PI * 2 + rand() * 0.4);
			const p = stepAlong(parkDir, t, range(rand, 2.2, 4.8));
			const tree = createTree(
				pick(rand, ['rain', 'rain', 'tabebuia', 'jacaranda'] as TreeKind[]),
				rand
			);
			if (!layout.isFree(p, tree.radius + 0.4)) continue;
			addStatic(tree.group, p, t);
			layout.reserve(p, tree.radius + 0.3);
		}
		for (let i = 0; i < 2; i++) {
			const t = anyTangent(parkDir).applyAxisAngle(parkDir, i * Math.PI + 0.5);
			const p = stepAlong(parkDir, t, 1.2);
			addStatic(createBench(), p, t.clone().negate());
			layout.reserve(p, 0.6);
		}
	}

	// Granite boulders — Bengaluru sits on some of the oldest rock on Earth.
	let boulderDir: THREE.Vector3 | undefined;
	for (let i = 0; i < 5; i++) {
		const p = layout.randomFreeSpot(1.2, 1);
		if (!p) continue;
		boulderDir ??= p;
		const rocks = new THREE.Group();
		for (let k = 0; k < 3; k++) {
			const r = blob(
				rocks,
				range(rand, 0.5, 1.0),
				k % 2 ? '#a9a49a' : '#bdb7ab',
				range(rand, -0.5, 0.5),
				0.2 + k * 0.1,
				range(rand, -0.5, 0.5)
			);
			r.scale.y = 0.7;
		}
		addStatic(rocks, p, anyTangent(p));
		layout.reserve(p, 1.1);
	}

	// --- Street life on the footpaths ----------------------------------------
	// Chai stall sits back from the kerb so its bench is on the footpath.
	let chaiFrame = null;
	for (let k = 0; k < 20 && !chaiFrame; k++)
		chaiFrame = placeOnFootpath(createChaiStall(), mainRoad, jU + 0.045 + k * 0.01, -1, 1.2, 2.3);
	placeOnFootpath(createFruitCart(rand), crossRoad, 0.58, 1, 0.9, 1.0, true);
	placeOnFootpath(createCow(true), mainRoad, jU + 0.3, 1, 0.7, 0.9, true);
	placeOnFootpath(createCow(false), crossRoad, 0.8, -1, 0.7, 0.9, true);

	// Street lamps along the main road, electricity poles + wires along the cross road.
	for (let k = 0; k < 16; k++)
		placeOnFootpath(createStreetLamp(), mainRoad, k / 16 + 0.02, 1, 0.15, 0.4);
	{
		const count = 18;
		const wirePairs: [THREE.Vector3, THREE.Vector3][] = [];
		let prev: THREE.Vector3[] | null = null;
		let prevK = -2;
		for (let k = 0; k < count; k++) {
			const pole = createElectricPole();
			const f = placeOnFootpath(pole.group, crossRoad, k / count, -1, 0.15, 0.4);
			if (!f) continue;
			pole.group.updateMatrixWorld(true);
			const pts = pole.attach.map((a) => a.clone().applyMatrix4(pole.group.matrixWorld));
			if (prev && prevK === k - 1) pts.forEach((p, i) => wirePairs.push([prev![i], p]));
			prev = pts;
			prevK = k;
		}
		staticRoot.add(createWires(wirePairs, (p) => p.clone().normalize()));
	}

	// --- Houses & avenue trees lining both roads -----------------------------
	for (const road of roads) {
		for (const side of [1, -1] as const) {
			let u = rand() * 0.02;
			while (u < 1) {
				const roll = rand();
				if (roll < 0.2) {
					const tree = createTree(
						pick(rand, ['gulmohar', 'jacaranda', 'rain', 'palm'] as TreeKind[]),
						rand
					);
					const f = road.frameAt(u, side * (ROAD_HALF_WIDTH + FOOTPATH_WIDTH + 0.6));
					if (layout.isFree(f.up, tree.radius + 0.5, FOOTPATH_WIDTH)) {
						addStatic(tree.group, f.up, f.forward);
						layout.reserve(f.up, tree.radius + 0.4);
					}
					u += 3 / road.length;
				} else if (roll < 0.85) {
					const house = createHouse(rand);
					if (placeBuilding(house, road, u, side) && rand() < 0.3) {
						const f = road.frameAt(u, side * (ROAD_HALF_WIDTH + FOOTPATH_WIDTH * 0.55));
						if (layout.isFree(f.up, 0.5, 0.1)) {
							addStatic(createRangoli(rand), f.up, f.forward, 0.01);
							layout.reserve(f.up, 0.5, false);
						}
					}
					u += (house.width + range(rand, 0.4, 1.2)) / road.length;
				} else {
					u += 2.5 / road.length;
				}
			}
		}
	}

	// --- Scattered trees, bushes, flower carpets ------------------------------
	const kinds: TreeKind[] = [
		'rain',
		'rain',
		'rain',
		'jacaranda',
		'jacaranda',
		'gulmohar',
		'tabebuia',
		'palm',
		'palm'
	];
	for (let i = 0; i < 55; i++) {
		const kind = pick(rand, kinds);
		const tree = createTree(kind, rand);
		const p = layout.randomFreeSpot(tree.canopy * 0.6, 1);
		if (!p) continue;
		addStatic(tree.group, p, anyTangent(p).applyAxisAngle(p, rand() * 6.28));
		layout.reserve(p, tree.canopy * 0.55, true, tree.radius);
		// Carpet of fallen blossoms under jacaranda and tabebuia.
		if (kind === 'jacaranda' || kind === 'tabebuia')
			patches.push({
				dir: p,
				radius: tree.canopy * 0.8,
				color: kind === 'jacaranda' ? PALETTE.jacaranda : PALETTE.tabebuia
			});
	}
	for (let i = 0; i < 70; i++) {
		const p = layout.randomFreeSpot(0.45, 0.8);
		if (!p) continue;
		const bush = new THREE.Group();
		const n = 2 + Math.floor(rand() * 2);
		for (let k = 0; k < n; k++)
			blob(
				bush,
				range(rand, 0.25, 0.42),
				k % 2 ? PALETTE.bush : PALETTE.rainTree,
				(k - n / 2) * 0.3,
				0.2,
				range(rand, -0.15, 0.15)
			);
		addStatic(bush, p, anyTangent(p));
		layout.reserve(p, 0.4);
	}
	{
		// A tree katte (stone platform round a big tree) for the neighbourhood
		const p = layout.randomFreeSpot(1.8, 1);
		if (p) {
			const katte = createTreeKatte(rand);
			addStatic(katte.group, p, anyTangent(p));
			layout.reserve(p, 1.8, true, 1.4);
		}
	}

	// --- Planet surface (needs all patches) + merge static props --------------
	const planet = createPlanet(roads, patches);
	scene.add(planet);
	const staticMeshes = mergeStatic(staticRoot);
	scene.add(staticMeshes);

	// --- NPCs ---------------------------------------------------------------
	const npcAnchors: Record<string, THREE.Vector3 | undefined> = {
		chef: chaiFrame?.up,
		diver: lakeDir ?? undefined,
		alien: parkDir ?? undefined,
		musician: crossRoad.frameAt(0.32).up,
		caveman: boulderDir
	};
	const npcs: Npc[] = [];
	for (const id of npcIds) {
		const anchor = npcAnchors[id] ?? mainRoad.frameAt(rand(), 4).up;
		const up = layout.findSpot(anchor, 0.6, 0.6) ?? anchor.clone();
		const character = createNpcCharacter(id);
		character.group.userData.npcId = id;
		character.group.traverse((o) => (o.castShadow = true));
		const facing = anyTangent(up).applyAxisAngle(up, rand() * Math.PI * 2);
		placeOnSurface(character.group, up, facing);
		scene.add(character.group);
		layout.reserve(up, 0.6, true, 0.4);
		npcs.push({ id, character, up, facing, phase: rand() * 10 });
	}

	// --- Player ---------------------------------------------------------------
	const spawnFrame = mainRoad.frameAt(jU + 0.03, -(ROAD_HALF_WIDTH + FOOTPATH_WIDTH * 0.5));
	const playerChar = createPlayer();
	playerChar.group.traverse((o) => (o.castShadow = true));
	scene.add(playerChar.group);
	const player = new PlayerController(
		playerChar,
		spawnFrame.up,
		spawnFrame.forward,
		layout.colliders
	);

	// --- Traffic --------------------------------------------------------------
	const vehicles: Vehicle[] = [];
	const addVehicle = (
		object: THREE.Object3D,
		road: Road,
		u: number,
		speed: number,
		direction: 1 | -1
	) => {
		object.traverse((o) => (o.castShadow = true));
		scene.add(object);
		vehicles.push({ object, road, u, speed, direction, lane: 0.85 });
	};
	addVehicle(createAuto(), mainRoad, 0.1, 4.5, 1);
	addVehicle(createAuto(), mainRoad, 0.55, 5, 1);
	addVehicle(createAuto(), mainRoad, 0.3, 4, -1);
	addVehicle(createAuto(), mainRoad, 0.8, 4.8, -1);
	addVehicle(createAuto(), crossRoad, 0.2, 4.2, -1);
	for (let i = 0; i < 4; i++)
		addVehicle(createScooter(rand), crossRoad, 0.08 + i * 0.23, 5.5 + i * 0.8, i % 2 ? 1 : -1);
	for (let i = 0; i < 3; i++)
		addVehicle(createScooter(rand), mainRoad, 0.15 + i * 0.28, 6 + i, i % 2 ? 1 : -1);

	const clouds = createClouds(rand);
	scene.add(clouds.group);

	const outline = new OutlineRenderer(renderer, scene, camera);

	// --- Per-frame ------------------------------------------------------------
	const tmp = new THREE.Vector3();
	const updateVehicles = (dt: number) => {
		for (const v of vehicles) {
			v.u += (v.direction * v.speed * dt) / v.road.length;
			// India drives on the left.
			const f = v.road.frameAt(v.u, -v.direction * v.lane);
			placeOnSurface(v.object, f.up, f.forward.multiplyScalar(v.direction), ROAD_HEIGHT);
		}
	};

	const updateNpcs = (elapsed: number) => {
		for (const n of npcs) {
			// Turn to face the player when they come close.
			if (n.character.group.position.distanceTo(player.position) < 5) {
				tmp.copy(player.up).sub(n.up);
				if (tmp.lengthSq() > 1e-8) n.facing.lerp(toTangent(tmp, n.up), 0.08);
			}
			toTangent(n.facing, n.up);
			const sway = Math.sin(elapsed * 2 + n.phase);
			placeOnSurface(n.character.group, n.up, n.facing, Math.max(0, sway) * 0.03);
			animateCharacter(n.character, elapsed * 1.5 + n.phase, 0.12);
		}
	};

	const updateSun = () => {
		const right = tmp.crossVectors(player.viewForward, player.up).normalize();
		const dir = player.up
			.clone()
			.add(right.multiplyScalar(0.5))
			.addScaledVector(player.viewForward, -0.35)
			.normalize();
		sun.target.position.copy(player.position);
		sun.position.copy(player.position).addScaledVector(dir, 30);
	};

	return {
		camera,
		player,
		npcObjects: npcs.map((n) => n.character.group),
		setAnimationLoop: (callback) => renderer.setAnimationLoop(callback),
		update(dt, elapsed, input) {
			player.update(dt, input);
			player.updateCamera(camera, dt);
			updateVehicles(dt);
			updateNpcs(elapsed);
			clouds.update(dt);
			updateSun();
		},
		render(elapsed) {
			outline.render(elapsed);
		},
		resize(width, height) {
			renderer.setSize(width, height, false);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			outline.setSize(width, height);
		},
		nearbyNpc() {
			let best: string | null = null;
			let bestD = TALK_DISTANCE;
			for (const n of npcs) {
				const d = n.character.group.position.distanceTo(player.position);
				if (d < bestD) {
					bestD = d;
					best = n.id;
				}
			}
			return best;
		},
		dispose() {
			outline.dispose();
			scene.traverse((o) => {
				const m = o as THREE.Mesh;
				if (m.isMesh) m.geometry.dispose();
			});
			(planet.material as THREE.Material).dispose();
			disposeMaterials();
			renderer.dispose();
		}
	};
}
