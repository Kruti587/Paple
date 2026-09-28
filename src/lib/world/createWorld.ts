import * as THREE from 'three';
import { createNpcCharacter, createPlayer, animateCharacter, type Character } from './characters';
import { FOOTPATH_WIDTH, PALETTE, ROAD_HALF_WIDTH } from './constants';
import type { MoveInput } from './input';
import { Layout } from './layout';
import { disposeMaterials, toon } from './materials';
import { mergeStatic } from './merge';
import { CYCLE_SECONDS, hourAt, sampleLighting, SPAN_HOURS, START_HOUR } from './dayCycle';
import { NightLights } from './nightLights';
import { GLOW_LAYER, OutlineRenderer } from './outlinePass';
import { createPlanet, type GroundPatch } from './planet';
import { PlayerController } from './player';
import {
	createApartmentBlock,
	createBangalorePalace,
	createCornerShop,
	createGlassHouse,
	createGopuram,
	createHotel,
	createHouse,
	createMuseum,
	createRowHouse,
	createVeenaModel,
	createVidhanaSoudha,
	type Building
} from './props/buildings';
import { createBrokenUFO, type BrokenUFO } from './props/ufo';
import { createWildlifeSystem, type WildlifeSystem } from './props/wildlife';
import { createTharCrashEvent, type TharCrashEvent } from './props/tharCrash';
import { createAnakinHQ, createKiosk, createQuestMarker } from './props/anakinHQ';
import { createClouds } from './props/clouds';
import { disposeSignTextures } from './props/signs';
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
import { blob, box, cylinder, pick, range, sphere } from './props/util';
import { createAuto, createCar, createScooter, type VehicleKind } from './props/vehicles';
import { Traffic } from './traffic';
import { buildRoadNetwork, Road, sphereCap } from './roads';
import { anyTangent, mulberry32, placeOnSurface, stepAlong, surfaceDistance, toTangent } from './sphere';
import { quests } from '../game/questManager';

const TALK_DISTANCE = 2.4;

export interface Zone {
	id: string;
	label: string;
	dir: THREE.Vector3;
	radius: number;
}

export interface World {
	camera: THREE.PerspectiveCamera;
	player: PlayerController;
	scene: THREE.Scene;
	renderer: THREE.WebGLRenderer;
	outline: OutlineRenderer;
	/** Key quest locations on the planet (unit directions). */
	quest: QuestSites;
	/** Show the floating quest beacon over a spot on the planet (null hides it). */
	setMarker(dir: THREE.Vector3 | null): void;
	/** 'title': slow orbit round the planet; 'intro': spinning fly-in to the player; 'follow': gameplay. */
	setCameraMode(mode: CameraMode, introSeconds?: number): void;
	cameraMode(): CameraMode;
	/** Clickable NPC roots, each tagged with userData.npcId. */
	npcObjects: THREE.Object3D[];
	setAnimationLoop(callback: XRFrameRequestCallback | null): void;
	/** `playerActive: false` freezes the player (title, intro, indoors, terminal open). */
	update(dt: number, elapsed: number, input: MoveInput, opts?: { playerActive?: boolean }): void;
	/** Current in-game hour (8 = 8 AM … 20 = 8 PM). */
	hour(): number;
	/** Jump the clock forward/back by in-game hours (debug / impatience). */
	skipHours(hours: number): void;
	setHour(hour: number): void;
	render(elapsed: number): void;
	resize(width: number, height: number): void;
	/** NPC within talking distance of the player, if any. */
	nearbyNpc(): string | null;
	currentZone(): Zone | null;
	canInteractItem(): { type: 'veena' | 'veena_deliver' | 'strut' | 'relic' | 'flint' | 'ufo'; prompt: string } | null;
	interactItem(): void;
	tharChatter(): string | null;
	dispose(): void;
}

export type CameraMode = 'title' | 'intro' | 'follow';

export interface QuestSites {
	/** Stand here to walk in through the ANAKIN HQ entrance. */
	door: THREE.Vector3;
	/** Where the player reappears when leaving the building. */
	outside: THREE.Vector3;
	/** Away from the entrance, tangent at `outside`. */
	outward: THREE.Vector3;
	/** The street terminal a few steps from the entrance. */
	kiosk: THREE.Vector3;
}

interface Npc {
	id: string;
	character: Character;
	up: THREE.Vector3;
	facing: THREE.Vector3;
	phase: number;
}

/** Height of a building model. Call before placing it (while it still sits at the origin). */
function buildingHeight(b: Building): number {
	b.group.updateMatrixWorld(true);
	return new THREE.Box3().setFromObject(b.group).max.y;
}

export function createWorld(canvas: HTMLCanvasElement, npcIds: string[]): World {
	const rand = mulberry32(20260926);

	// --- Renderer / scene ---------------------------------------------------
	const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFShadowMap;
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 200);
	camera.layers.enable(GLOW_LAYER);

	const ambient = new THREE.AmbientLight(0xffffff, 1.35);
	scene.add(ambient);
	const nightLights = new NightLights();
	scene.add(nightLights.group);
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
		const height = buildingHeight(b); // measure before it's moved onto the planet
		addStatic(b.group, f.up, facing);
		if (b.hollowFootprint) {
			layout.reserveWalkthrough(f.up, facing, b.width, b.depth);
		} else {
			layout.reserveBox(f.up, facing, b.width, b.depth, height);
		}
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
	const vidhana = createVidhanaSoudha();
	placeLandmark(vidhana, mainRoad, 0.14, 1, 1.2);
	const vidhanaDir = vidhana.group.position.clone().normalize();

	const gopuram = createGopuram();
	placeLandmark(gopuram, crossRoad, 0.32, -1, 0.2);
	const gopuramDir = gopuram.group.position.clone().normalize();

	const hotel = createHotel(rand);
	placeLandmark(hotel, mainRoad, 0.42, -1, 0.3);
	const hotelDir = hotel.group.position.clone().normalize();

	const museum = createMuseum();
	placeLandmark(museum, mainRoad, 0.74, 1, 0.4);
	const museumDir = museum.group.position.clone().normalize();

	const glassHouse = createGlassHouse();
	placeLandmark(glassHouse, crossRoad, 0.52, 1, 0.4);
	const glassHouseDir = glassHouse.group.position.clone().normalize();

	const palace = createBangalorePalace();
	placeLandmark(palace, crossRoad, 0.84, 1, 0.5);
	const palaceDir = palace.group.position.clone().normalize();

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

	// --- Quest building: ANAKIN HQ, just across the road from the start junction ---
	const hq = createAnakinHQ();
	let hqUp: THREE.Vector3 | null = null;
	const hqFacing = new THREE.Vector3();
	for (const side of [1, -1] as const) {
		for (let k = 0; k < 60 && !hqUp; k++) {
			if (placeBuilding(hq.building, mainRoad, jU + 0.06 + k * 0.01, side, 0.6)) {
				hqUp = hq.building.group.position.clone().normalize();
				hqFacing.set(0, 0, 1).applyQuaternion(hq.building.group.quaternion);
			}
		}
		if (hqUp) break;
	}
	if (!hqUp) throw new Error('No room for the ANAKIN HQ');
	{
		const signRoot = new THREE.Group();
		signRoot.position.copy(hq.building.group.position);
		signRoot.quaternion.copy(hq.building.group.quaternion);
		signRoot.add(hq.sign);
		scene.add(signRoot);
	}
	const hqRight = new THREE.Vector3().crossVectors(hqUp, hqFacing).normalize();
	const doorDir = stepAlong(hqUp, hqFacing, hq.building.depth / 2 + 0.25);
	// On the footpath just outside the entrance (clear of the door trigger, off the road).
	const outsideDir = stepAlong(hqUp, hqFacing, hq.building.depth / 2 + 1.35);
	// Keep the entrance clear of lamps, trees and carts.
	layout.reserve(stepAlong(hqUp, hqFacing, hq.building.depth / 2 + 1.2), 1.4, false);
	const kiosk = createKiosk();
	const kioskDir =
		layout.findSpot(
			stepAlong(
				stepAlong(hqUp, hqFacing, hq.building.depth / 2 + 1.0),
				hqRight,
				hq.building.width / 2 + 0.9
			),
			0.45,
			0.25
		) ?? outsideDir.clone();
	{
		// Screen faces the entrance, so you see it as you run out.
		const toDoor = doorDir.clone().sub(kioskDir);
		placeOnSurface(kiosk.group, kioskDir, toDoor.lengthSq() > 1e-10 ? toDoor : hqFacing.clone());
		scene.add(kiosk.group);
		layout.reserve(kioskDir, 0.45);
	}
	const questSites: QuestSites = {
		door: doorDir,
		outside: outsideDir,
		outward: toTangent(hqFacing.clone(), outsideDir),
		kiosk: kioskDir
	};
	const marker = createQuestMarker();
	marker.group.visible = false;
	scene.add(marker.group);

	let ufo: BrokenUFO | null = null;
	let wildlife: WildlifeSystem | null = null;
	let tharCrash: TharCrashEvent | null = null;
	let hasVeena = false;
	let hasDeliveredVeena = false;
	let hasStrut = false;
	let hasSunkenRelic = false;
	let hasFlint = false;
	let inspectedUfo = false;

	// ═════════════════════════════════════════════════════════════════════════
	// 1. ULSOOR LAKE & PIER (Roadside beside cross road at u=0.14)
	// ═════════════════════════════════════════════════════════════════════════
	const lakeFrame = crossRoad.frameAt(0.14, -1 * (ROAD_HALF_WIDTH + FOOTPATH_WIDTH + 4.2));
	const lakeDir = lakeFrame.up;
	const lakeApproach = crossRoad.frameAt(0.14, -1 * (ROAD_HALF_WIDTH + FOOTPATH_WIDTH + 1.2)).up;
	// Clear the approach from the road to the water so no buildings block access
	layout.reserve(lakeApproach, 2.6, false);

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

	// Wooden pier/deck extending from the footpath onto the lake
	const pier = new THREE.Group();
	box(pier, 1.4, 0.12, 3.0, '#5c4028', 0, 0.22, 1.5);
	for (const x of [-0.6, 0.6]) {
		for (const z of [0.4, 1.6, 2.8]) {
			cylinder(pier, 0.06, 0.06, 0.6, '#3e2718', x, -0.08, z, 6);
		}
	}
	sphere(pier, 0.08, '#ffcc44', -0.6, 0.48, 2.9, 6);
	sphere(pier, 0.08, '#ffcc44', 0.6, 0.48, 2.9, 6);
	addStatic(pier, lakeApproach, lakeFrame.right.clone().multiplyScalar(-1));

	// Glowing Sunken Lotus Relic resting on the lake bed
	const relicPos = stepAlong(lakeDir, anyTangent(lakeDir), 1.8);
	const relicGroup = new THREE.Group();
	sphere(relicGroup, 0.18, '#ffd700', 0, 0.1, 0, 8); // Gold relic
	sphere(relicGroup, 0.32, '#00ffff', 0, 0.1, 0, 8).scale.y = 0.4; // Glowing cyan aqua aura
	for (let p = 0; p < 6; p++) {
		const angle = (p / 6) * Math.PI * 2;
		box(relicGroup, 0.08, 0.04, 0.22, '#ff66aa', Math.sin(angle) * 0.2, 0.1, Math.cos(angle) * 0.2);
	}
	addStatic(relicGroup, relicPos, anyTangent(relicPos), 0.05);

	// Lake is reserved as non-solid (solid: false) so player can wade in without bouncing out!
	layout.reserve(lakeDir, 5.0, false);

	// ═════════════════════════════════════════════════════════════════════════
	// 2. CUBBON PARK & UFO CRASH (Roadside beside main road at u=0.88)
	// ═════════════════════════════════════════════════════════════════════════
	const parkFrame = mainRoad.frameAt(0.88, -1 * (ROAD_HALF_WIDTH + FOOTPATH_WIDTH + 4.5));
	const parkDir = parkFrame.up;
	const parkApproach = mainRoad.frameAt(0.88, -1 * (ROAD_HALF_WIDTH + FOOTPATH_WIDTH + 1.2)).up;
	layout.reserve(parkApproach, 2.6, false);

	patches.push({ dir: parkDir, radius: 5.5, color: PALETTE.grassDark });
	for (let i = 0; i < 8; i++) {
		const t = anyTangent(parkDir).applyAxisAngle(parkDir, (i / 8) * Math.PI * 2 + rand() * 0.4);
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

	// Grand entrance arch for Cubbon Park
	const parkArch = new THREE.Group();
	cylinder(parkArch, 0.14, 0.14, 3.2, '#2d5a27', -1.2, 1.6, 0, 8);
	cylinder(parkArch, 0.14, 0.14, 3.2, '#2d5a27', 1.2, 1.6, 0, 8);
	box(parkArch, 2.8, 0.4, 0.25, '#1e3f1a', 0, 3.1, 0);
	box(parkArch, 2.4, 0.25, 0.08, '#ffd700', 0, 3.1, 0.15); // Golden plaque
	addStatic(parkArch, parkApproach, parkFrame.right.clone().multiplyScalar(-1));

	// Broken UFO crash-landed in Cubbon Park
	ufo = createBrokenUFO();
	const ufoPos = stepAlong(parkDir, parkFrame.right.clone().multiplyScalar(-1), 1.8);
	placeOnSurface(ufo.group, ufoPos, anyTangent(ufoPos));
	scene.add(ufo.group);

	// Ambient wildlife system (birds flying, butterflies fluttering, rabbits hopping)
	wildlife = createWildlifeSystem(parkDir, lakeDir);
	placeOnSurface(wildlife.group, parkDir, anyTangent(parkDir));
	scene.add(wildlife.group);

	layout.reserve(parkDir, 5.0, false);

	// ═════════════════════════════════════════════════════════════════════════
	// 3. PRECAMBRIAN BOULDERS & CAMPFIRE (Beside cross road at u=0.76)
	// ═════════════════════════════════════════════════════════════════════════
	const boulderFrame = crossRoad.frameAt(0.76, -1 * (ROAD_HALF_WIDTH + FOOTPATH_WIDTH + 3.2));
	const boulderDir = boulderFrame.up;
	const boulderApproach = crossRoad.frameAt(0.76, -1 * (ROAD_HALF_WIDTH + FOOTPATH_WIDTH + 1.2)).up;
	layout.reserve(boulderApproach, 2.2, false);

	const rocks = new THREE.Group();
	for (let k = 0; k < 5; k++) {
		const r = blob(
			rocks,
			range(rand, 0.7, 1.3),
			k % 2 ? '#a9a49a' : '#bdb7ab',
			range(rand, -0.9, 0.9),
			0.2 + k * 0.15,
			range(rand, -0.9, 0.9)
		);
		r.scale.y = 0.7;
	}
	// Campfire
	cylinder(rocks, 0.08, 0.08, 0.8, '#4a2e16', 0.2, 0.1, 0.4, 6).rotation.z = 0.5;
	cylinder(rocks, 0.08, 0.08, 0.8, '#4a2e16', -0.2, 0.1, 0.4, 6).rotation.z = -0.5;
	sphere(rocks, 0.2, '#ff4500', 0, 0.25, 0.4, 8);
	sphere(rocks, 0.12, '#ffcc00', 0, 0.35, 0.4, 6);
	// Primordial sharp flint stone
	box(rocks, 0.2, 0.15, 0.2, '#222222', -0.5, 0.1, 0.6);
	addStatic(rocks, boulderDir, anyTangent(boulderDir));
	layout.reserve(boulderDir, 3.2, false);

	// --- Street life on the footpaths ----------------------------------------
	// Chai stall sits back from the kerb so its bench is on the footpath.
	let chaiFrame = null;
	for (let k = 0; k < 20 && !chaiFrame; k++)
		chaiFrame = placeOnFootpath(createChaiStall(), mainRoad, jU + 0.045 + k * 0.01, -1, 1.2, 2.3);
	placeOnFootpath(createFruitCart(rand), crossRoad, 0.58, 1, 0.9, 1.0, true);
	placeOnFootpath(createCow(true), mainRoad, jU + 0.3, 1, 0.7, 0.9, true);
	placeOnFootpath(createCow(false), crossRoad, 0.8, -1, 0.7, 0.9, true);

	// Street lamps along the main road, electricity poles + wires along the cross road.
	for (let k = 0; k < 16; k++) {
		const lamp = createStreetLamp();
		const f = placeOnFootpath(lamp, mainRoad, k / 16 + 0.02, 1, 0.15, 0.4);
		if (!f) continue;
		// Night glow: a pool of light on the road under the lamp head, and a halo round it.
		lamp.updateMatrixWorld(true);
		nightLights.addHalo(lamp.localToWorld(new THREE.Vector3(0, 3.85, 0.9)));
		nightLights.addPool(stepAlong(f.up, f.right.clone().negate(), 0.9));
	}
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
	// Mostly two-storey homes; Bangalore streets are packed wall-to-wall.
	// Shuffle-deck: cycle through all four types before any type repeats.
	// Much better visual variety than a plain rand() branch.
	const deckFactories: (() => Building)[] = [
		() => createHouse(rand),
		() => createRowHouse(rand),
		() => createCornerShop(rand),
		() => createApartmentBlock(rand)
	];
	let deckPool: (() => Building)[] = [];
	const randomBuilding = (): Building => {
		if (!deckPool.length) {
			// Reshuffle: Fisher-Yates with our seeded rand
			deckPool = [...deckFactories];
			for (let i = deckPool.length - 1; i > 0; i--) {
				const j = Math.floor(rand() * (i + 1));
				[deckPool[i], deckPool[j]] = [deckPool[j], deckPool[i]];
			}
		}
		return deckPool.pop()!();
	};

	for (const road of roads) {
		for (const side of [1, -1] as const) {
			let u = rand() * 0.01;
			while (u < 1) {
				const roll = rand();
				if (roll < 0.07) {
					// Occasional avenue tree squeezed between buildings
					const tree = createTree(
						pick(rand, ['gulmohar', 'jacaranda', 'rain', 'palm'] as TreeKind[]),
						rand
					);
					const f = road.frameAt(u, side * (ROAD_HALF_WIDTH + FOOTPATH_WIDTH + 0.6));
					if (layout.isFree(f.up, tree.radius + 0.5, FOOTPATH_WIDTH)) {
						addStatic(tree.group, f.up, f.forward);
						layout.reserve(f.up, tree.radius + 0.4);
					}
					u += 2.5 / road.length;
				} else if (roll < 0.98) {
					const house = randomBuilding();
					if (placeBuilding(house, road, u, side) && rand() < 0.25) {
						const f = road.frameAt(u, side * (ROAD_HALF_WIDTH + FOOTPATH_WIDTH * 0.55));
						if (layout.isFree(f.up, 0.5, 0.1)) {
							addStatic(createRangoli(rand), f.up, f.forward, 0.01);
							layout.reserve(f.up, 0.5, false);
						}
					}
					// Tight spacing — Bangalore houses share walls
					u += (house.width + range(rand, 0.05, 0.3)) / road.length;
				} else {
					// Rare gap (narrow alley between buildings)
					u += 1.2 / road.length;
				}
			}
			// Back row behind the roadside houses, across a narrow service lane.
			u = rand() * 0.01;
			while (u < 1) {
				const house = randomBuilding();
				placeBuilding(house, road, u, side, range(rand, 5.2, 5.8));
				u += (house.width + range(rand, 0.05, 0.3)) / road.length;
			}
		}
	}

	// --- Dense off-road neighbourhoods (Bangalore galli clusters) -------------
	// Grids of houses facing each other across narrow lanes, like the residential
	// pockets of Jayanagar, Malleshwaram and Basavanagudi.
	const placeClusterBuilding = (
		b: Building,
		dir: THREE.Vector3,
		facing: THREE.Vector3
	): boolean => {
		if (!layout.boxIsFree(dir, facing, b.width, b.depth, FOOTPATH_WIDTH)) return false;
		const height = buildingHeight(b); // measure before it's moved onto the planet
		addStatic(b.group, dir, facing);
		layout.reserveBox(dir, facing, b.width, b.depth, height);
		return true;
	};

	const LANE_WIDTH = 1.6;
	for (let ci = 0; ci < 18; ci++) {
		const center = layout.randomFreeSpot(2.5, 2.5);
		if (!center) continue;
		const along = anyTangent(center).applyAxisAngle(center, rand() * Math.PI);
		const across = new THREE.Vector3().crossVectors(center, along).normalize();
		let placed = 0;
		// Rows of houses: each pair of rows faces each other across a lane (a galli),
		// and pairs sit back to back.
		for (let row = 0; row < 4; row++) {
			const facesLane = row % 2 === 0 ? 1 : -1;
			const pair = Math.floor(row / 2);
			const rowOffset = -7 + pair * (2 * 4 + LANE_WIDTH + 0.3) + (row % 2) * (4 + LANE_WIDTH);
			const rowCentre = stepAlong(center, across, rowOffset);
			const rowAlong = along.clone().addScaledVector(rowCentre, -along.dot(rowCentre)).normalize();
			let x = -7 + rand();
			while (x < 7) {
				const b = randomBuilding();
				const pos = stepAlong(rowCentre, rowAlong, x + b.width / 2);
				const facing = across.clone().multiplyScalar(facesLane);
				if (placeClusterBuilding(b, pos, facing)) placed++;
				x += b.width + range(rand, 0.05, 0.25);
			}
		}
		// Dusty red-earth lanes under the neighbourhood
		if (placed > 3) patches.push({ dir: center, radius: 8, color: PALETTE.lateriteLight });
	}

	// Infill: squeeze more homes into any remaining open ground.
	for (let i = 0; i < 260; i++) {
		const b = randomBuilding();
		const p = layout.randomFreeSpot(Math.min(b.width, b.depth) / 2 + 0.3, 1.2, 20);
		if (!p) continue;
		// Face the nearest road, as homes do.
		const road = roads.reduce((best, r) => (r.distanceTo(p) < best.distanceTo(p) ? r : best));
		const toRoad = road.frameAt(road.nearestU(p)).up.clone().sub(p);
		const facing = toRoad.lengthSq() > 1e-8 ? toRoad : anyTangent(p);
		placeClusterBuilding(b, p, facing.addScaledVector(p, -facing.dot(p)).normalize());
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
	for (let i = 0; i < 32; i++) {
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
		chef: stepAlong(hotelDir, anyTangent(hotelDir), 1.2),
		diver: stepAlong(lakeApproach, lakeFrame.right.clone().multiplyScalar(-1), 1.0),
		alien: stepAlong(parkApproach, parkFrame.right.clone().multiplyScalar(-1), 1.0),
		musician: crossRoad.frameAt(0.68, ROAD_HALF_WIDTH + FOOTPATH_WIDTH * 0.5).up,
		caveman: stepAlong(boulderApproach, boulderFrame.right.clone().multiplyScalar(-1), 0.9)
	};
	// Veena resting beside Musician once presented
	const musicianVeena = createVeenaModel();
	musicianVeena.scale.set(0.85, 0.85, 0.85);
	musicianVeena.position.set(0.45, 0.18, 0.25);
	musicianVeena.rotation.set(0.1, 0.4, 0.2);
	musicianVeena.visible = false;

	const npcs: Npc[] = [];
	for (const id of npcIds) {
		const anchor = npcAnchors[id] ?? mainRoad.frameAt(rand(), 4).up;
		const up = layout.findSpot(anchor, 0.6, 0.6) ?? anchor.clone();
		const character = createNpcCharacter(id);
		character.group.userData.npcId = id;
		character.group.traverse((o) => (o.castShadow = true));
		if (id === 'musician') {
			character.group.add(musicianVeena);
		}
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

	// Wearable Veena slung across player's back
	const playerVeena = createVeenaModel();
	playerVeena.scale.set(0.65, 0.65, 0.65);
	playerVeena.position.set(-0.06, 0.82, -0.22);
	playerVeena.rotation.set(0.25, 0.12, -0.78);
	playerChar.group.add(playerVeena);
	playerVeena.visible = false;

	scene.add(playerChar.group);
	const player = new PlayerController(
		playerChar,
		spawnFrame.up,
		spawnFrame.forward,
		layout.colliders
	);
	player.waterCenter = lakeDir;
	player.waterRadius = 4.4;

	// ── MAHINDRA THAR POLE CRASH EVENT (Curbside on Main Road u=0.58) ──────
	tharCrash = createTharCrashEvent();
	const tharFrame = mainRoad.frameAt(0.58, 1 * (ROAD_HALF_WIDTH + FOOTPATH_WIDTH + 1.2));
	placeOnSurface(tharCrash.group, tharFrame.up, tharFrame.forward);
	scene.add(tharCrash.group);
	layout.reserve(tharFrame.up, 2.6, false);

	// --- Traffic --------------------------------------------------------------
	const traffic = new Traffic();
	const addVehicle = (
		object: THREE.Object3D,
		kind: VehicleKind,
		road: Road,
		u: number,
		speed: number,
		direction: 1 | -1
	) => {
		object.traverse((o) => (o.castShadow = true));
		scene.add(object);
		traffic.add(object, kind, road, u, speed, direction);
	};
	addVehicle(createAuto(), 'auto', mainRoad, 0.1, 4.5, 1);
	addVehicle(createAuto(), 'auto', mainRoad, 0.55, 5, 1);
	addVehicle(createAuto(), 'auto', mainRoad, 0.3, 4, -1);
	addVehicle(createAuto(), 'auto', mainRoad, 0.8, 4.8, -1);
	addVehicle(createCar(rand), 'car', mainRoad, 0.68, 5.5, 1);
	addVehicle(createAuto(), 'auto', crossRoad, 0.2, 4.2, -1);
	addVehicle(createCar(rand), 'car', crossRoad, 0.45, 5, 1);
	for (let i = 0; i < 4; i++)
		addVehicle(
			createScooter(rand),
			'scooter',
			crossRoad,
			0.08 + i * 0.23,
			5.5 + i * 0.8,
			i % 2 ? 1 : -1
		);
	for (let i = 0; i < 3; i++)
		addVehicle(createScooter(rand), 'scooter', mainRoad, 0.15 + i * 0.28, 6 + i, i % 2 ? 1 : -1);

	const clouds = createClouds(rand);
	scene.add(clouds.group);

	const outline = new OutlineRenderer(renderer, scene, camera);

	// --- Per-frame ------------------------------------------------------------
	const tmp = new THREE.Vector3();
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

	// --- Day cycle ---------------------------------------------------------
	// Offset into the cycle (seconds). Start just after the 8 AM fade-in.
	let clockOffset = (0.3 / SPAN_HOURS) * CYCLE_SECONDS;
	let currentHour = START_HOUR;
	let lastElapsed = 0;
	const lighting = sampleLighting(START_HOUR);
	const sunDir = new THREE.Vector3();
	const moonDir = new THREE.Vector3();
	const lightDir = new THREE.Vector3();
	const horizontal = new THREE.Vector3();

	/**
	 * The sun's path is framed relative to the camera (like the old fixed key light) so the
	 * planet always looks good: it rises behind-right, swings past the right side through the
	 * day, and sets front-left — putting the pink sunset glow in view. The moon rides high behind.
	 */
	const updateSky = (elapsed: number) => {
		currentHour = hourAt(elapsed + clockOffset);
		const l = sampleLighting(currentHour, lighting);
		const up = player.up;
		const right = tmp.crossVectors(player.viewForward, up).normalize();

		const azimuth = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(-53, 120, l.dayProgress));
		horizontal
			.copy(right)
			.multiplyScalar(Math.cos(azimuth))
			.addScaledVector(player.viewForward, Math.sin(azimuth));
		const elev = THREE.MathUtils.degToRad(l.elevation);
		sunDir
			.copy(up)
			.multiplyScalar(Math.sin(elev))
			.addScaledVector(horizontal, Math.cos(elev))
			.normalize();
		moonDir
			.copy(up)
			.multiplyScalar(0.8)
			.addScaledVector(right, -0.35)
			.addScaledVector(player.viewForward, -0.45)
			.normalize();

		// Light never comes from below the horizon: clamp the sun, then hand over to the moon.
		const lowElev = THREE.MathUtils.degToRad(Math.max(l.elevation, 3));
		lightDir
			.copy(up)
			.multiplyScalar(Math.sin(lowElev))
			.addScaledVector(horizontal, Math.cos(lowElev));
		lightDir.lerp(moonDir, THREE.MathUtils.smoothstep(l.night, 0.3, 0.9)).normalize();
		// Title / intro: light the planet from over the camera's shoulder so the orbit never
		// looks at the dark side; hand back to the gameplay key light as the camera lands.
		const titleWeight = camMode === 'title' ? 1 : camMode === 'intro' ? 1 - easeInOut(introT) : 0;
		if (titleWeight > 0) {
			const camLight = camera.position
				.clone()
				.normalize()
				.add(new THREE.Vector3(0, 0.6, 0))
				.normalize();
			lightDir.lerp(camLight, titleWeight).normalize();
		}

		sun.color.copy(l.sun);
		sun.intensity = l.sunIntensity;
		sun.shadow.intensity = THREE.MathUtils.lerp(0.55, 0.3, l.night);
		ambient.color.copy(l.ambient);
		ambient.intensity = l.ambientIntensity;
		sun.target.position.copy(player.position);
		sun.position.copy(player.position).addScaledVector(lightDir, 30);

		nightLights.set(l.night);
		outline.setSky(l, up, l.night > 0.55 ? moonDir : sunDir);
	};

	// --- Title orbit & intro fly-in ---------------------------------------------
	let camMode: CameraMode = 'title';
	let orbitAngle = 0.6;
	let introT = 0;
	let introDuration = 3.2;
	const orbitPose = () => ({
		eye: new THREE.Vector3(Math.cos(orbitAngle) * 56, 20, Math.sin(orbitAngle) * 56),
		target: new THREE.Vector3(0, -2, 0),
		up: new THREE.Vector3(0, 1, 0)
	});
	const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
	const qTmp = new THREE.Quaternion();
	const Y = new THREE.Vector3(0, 1, 0);

	const updateCamera = (dt: number) => {
		if (camMode === 'follow') {
			player.updateCamera(camera, dt);
			return;
		}
		if (camMode === 'title') {
			orbitAngle += dt * 0.12;
			const p = orbitPose();
			camera.position.copy(p.eye);
			camera.up.copy(p.up);
			camera.lookAt(p.target);
			return;
		}
		// Intro: the world spins faster and faster while the camera swoops down to the player.
		introT = Math.min(1, introT + dt / introDuration);
		orbitAngle += dt * (0.12 + 2.4 * Math.sin(Math.PI * introT));
		const e = easeInOut(introT);
		const a = orbitPose();
		const b = player.followPose();
		const dirA = a.eye.clone().normalize();
		const dirB = b.eye.clone().normalize();
		const dir = dirA
			.clone()
			.applyQuaternion(
				qTmp.identity().slerp(new THREE.Quaternion().setFromUnitVectors(dirA, dirB), e)
			);
		// Extra spin around the planet axis that unwinds to zero as we arrive.
		const spin = (1 - e) * (1 - e) * Math.PI * 1.5;
		dir.applyAxisAngle(Y, spin);
		const eye = dir.multiplyScalar(THREE.MathUtils.lerp(a.eye.length(), b.eye.length(), e));
		const target = a.target.clone().lerp(b.target, e).applyAxisAngle(Y, spin);
		const up = a.up.clone().lerp(b.up.clone().applyAxisAngle(Y, spin), e).normalize();
		camera.position.copy(eye);
		camera.up.copy(up);
		camera.lookAt(target);
		if (introT >= 1) {
			camMode = 'follow';
			player.resetCamera();
		}
	};

	return {
		camera,
		player,
		scene,
		renderer,
		outline,
		quest: questSites,
		setMarker(dir) {
			marker.group.visible = !!dir;
			if (dir) placeOnSurface(marker.group, dir, anyTangent(dir));
		},
		setCameraMode(mode, introSeconds = 3.2) {
			camMode = mode;
			if (mode === 'intro') {
				introT = 0;
				introDuration = introSeconds;
			}
			if (mode === 'follow') player.resetCamera();
		},
		cameraMode: () => camMode,
		npcObjects: npcs.map((n) => n.character.group),
		setAnimationLoop: (callback) => renderer.setAnimationLoop(callback),
		update(dt, elapsed, input, opts = {}) {
			lastElapsed = elapsed;
			const active = opts.playerActive ?? true;
			// Traffic reacts to where the player is, then the player can't walk through vehicles.
			traffic.update(dt, player.up);
			player.update(dt, active ? input : { x: 0, z: 0, run: false }, traffic.colliders);
			updateCamera(dt);
			marker.update(elapsed);
			updateNpcs(elapsed);
			clouds.update(dt);
			updateSky(elapsed);
			ufo?.update(elapsed);
			wildlife?.update(elapsed, dt);
			tharCrash?.update(elapsed, dt);
			playerVeena.visible = hasVeena && !hasDeliveredVeena;
			musicianVeena.visible = hasDeliveredVeena;
		},
		hour: () => currentHour,
		skipHours(hours) {
			clockOffset += (hours / SPAN_HOURS) * CYCLE_SECONDS;
		},
		setHour(hour) {
			const target =
				((THREE.MathUtils.clamp(hour, START_HOUR, START_HOUR + SPAN_HOURS - 0.01) - START_HOUR) /
					SPAN_HOURS) *
				CYCLE_SECONDS;
			const now = ((hourAt(lastElapsed + clockOffset) - START_HOUR) / SPAN_HOURS) * CYCLE_SECONDS;
			clockOffset += target - now;
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
		currentZone(): Zone | null {
			const ZONES: Zone[] = [
				{ id: 'market', label: 'Junction Market', dir: junction.clone().normalize(), radius: 8 },
				{ id: 'temple', label: 'Sri Ganesha Temple', dir: gopuramDir, radius: 5.5 },
				{ id: 'hotel', label: 'Ramesh Grand Hotel', dir: hotelDir, radius: 5.0 },
				{ id: 'park', label: 'Cubbon Park & UFO Crash', dir: parkDir ?? junction.clone().normalize(), radius: 6.0 },
				{ id: 'lake', label: 'Ulsoor Lake', dir: lakeDir ?? junction.clone().normalize(), radius: 6.0 },
				{ id: 'boulders', label: 'Precambrian Boulders', dir: boulderDir ?? junction.clone().normalize(), radius: 5.0 },
				{ id: 'museum', label: 'Karnataka Science Museum', dir: museumDir, radius: 6.0 },
				{ id: 'glasshouse', label: 'Lalbagh Glass House', dir: glassHouseDir, radius: 6.0 },
				{ id: 'palace', label: 'Bangalore Palace', dir: palaceDir, radius: 6.5 },
				{ id: 'promenade', label: 'MG Road Promenade', dir: crossRoad.frameAt(0.68).up, radius: 6.0 }
			];
			for (const z of ZONES) {
				if (surfaceDistance(player.up, z.dir) <= z.radius) return z;
			}
			return null;
		},
		canInteractItem() {
			if (!hasVeena && surfaceDistance(player.up, gopuramDir) < 3.2) {
				return { type: 'veena' as const, prompt: 'Press [E] to collect the Divine Veena' };
			}
			if (hasVeena && !hasDeliveredVeena && surfaceDistance(player.up, crossRoad.frameAt(0.68).up) < 3.2) {
				return { type: 'veena_deliver' as const, prompt: 'Press [E] to present the Divine Veena to Vidwan Sundaram' };
			}
			if (!hasStrut && surfaceDistance(player.up, museumDir) < 3.5) {
				return { type: 'strut' as const, prompt: 'Press [E] to acquire the Quantum Titanium Strut' };
			}
			if (!hasSunkenRelic && surfaceDistance(player.up, lakeDir) < 3.8) {
				return { type: 'relic' as const, prompt: 'Press [E] to retrieve the Sunken Lotus Relic' };
			}
			if (!hasFlint && surfaceDistance(player.up, boulderDir) < 3.2) {
				return { type: 'flint' as const, prompt: 'Press [E] to gather Primordial Flint' };
			}
			if (!inspectedUfo && surfaceDistance(player.up, parkDir) < 3.8) {
				return { type: 'ufo' as const, prompt: 'Press [E] to inspect the damaged Flying Saucer' };
			}
			return null;
		},
		interactItem() {
			const item = this.canInteractItem();
			if (!item) return;
			if (item.type === 'veena') {
				hasVeena = true;
				quests.completeTask('musician_veena', 'get_veena');
				if (gopuram.group.userData.veena) {
					gopuram.group.userData.veena.visible = false;
				}
				playerVeena.visible = true;
			} else if (item.type === 'veena_deliver') {
				hasDeliveredVeena = true;
				playerVeena.visible = false;
				musicianVeena.visible = true;
				quests.completeTask('musician_veena', 'deliver_veena');
			} else if (item.type === 'strut') {
				hasStrut = true;
				quests.completeTask('alien_ufo_repair', 'steal_strut');
			} else if (item.type === 'relic') {
				hasSunkenRelic = true;
				quests.completeTask('mani_lake_revival', 'clear_debris');
			} else if (item.type === 'flint') {
				hasFlint = true;
				quests.completeTask('grog_ancient_spark', 'find_flint');
			} else if (item.type === 'ufo') {
				inspectedUfo = true;
				quests.completeTask('alien_ufo_repair', 'inspect_ufo');
			}
		},
		tharChatter(): string | null {
			return tharCrash ? tharCrash.getChatter(player.position) : null;
		},
		dispose() {
			outline.dispose();
			nightLights.dispose();
			scene.traverse((o) => {
				const m = o as THREE.Mesh;
				if (m.isMesh) m.geometry.dispose();
			});
			(planet.material as THREE.Material).dispose();
			disposeMaterials();
			disposeSignTextures();
			renderer.dispose();
		}
	};
}
