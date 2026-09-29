import * as THREE from 'three';
import { ROAD_HALF_WIDTH } from './constants';
import type { Circle } from './layout';
import { VEHICLE_SIZE, type VehicleKind } from './props/vehicles';
import type { Road } from './roads';
import { placeOnSurface, stepAlong } from './sphere';

const ROAD_HEIGHT = 0.06;
/** Lane centre distance from the road centreline. */
const LANE = 0.85;
const PLAYER_RADIUS = 0.35;
/** How far ahead drivers watch for obstacles (m, bumper to obstacle). */
const LOOK_AHEAD = 7;
/** Bumper gap kept when stopped (m). */
const STOP_GAP = 0.7;
/** Distance over which a driver eases off before the stop gap (m). */
const SLOW_ZONE = 4.5;
const SIDE_MARGIN = 0.3;
const ACCEL = 2.5;
const BRAKE = 9;
const LATERAL_SPEED = 1.4;
/** How far ahead in time drivers extrapolate the player's movement. */
const PREDICT_SECONDS = 0.8;

interface PlayerOnRoad {
	u: number;
	offset: number;
	/** Player velocity along / across the road (m/s). */
	vAlong: number;
	vOffset: number;
}

interface Vehicle {
	index: number;
	kind: VehicleKind;
	object: THREE.Object3D;
	road: Road;
	u: number;
	cruise: number;
	speed: number;
	direction: 1 | -1;
	/** Current lateral position, road frame (+ = road's right). */
	offset: number;
	targetOffset: number;
	halfLength: number;
	halfWidth: number;
	up: THREE.Vector3;
	forward: THREE.Vector3;
}

interface Obstacle {
	/** Distance ahead of the vehicle centre along its direction of travel (m). */
	along: number;
	/** Lateral position in the vehicle's road frame. */
	offset: number;
	halfLength: number;
	halfWidth: number;
	isPlayer: boolean;
	oncoming: boolean;
}

/** Signed shortest difference between loop parameters, in [-0.5, 0.5). */
const wrap = (d: number) => ((((d + 0.5) % 1) + 1) % 1) - 0.5;

/**
 * Road traffic that treats the player as an obstacle: drivers ease off and stop for you,
 * swerve around you when there's room and nothing is oncoming, queue behind stopped vehicles,
 * then drift back into their (left-hand) lane.
 */
export class Traffic {
	private readonly vehicles: Vehicle[] = [];
	private readonly lastPlayer = new Map<Road, { u: number; offset: number }>();
	/** Vehicle footprints for player collision, refreshed every update. */
	colliders: Circle[] = [];

	add(
		object: THREE.Object3D,
		kind: VehicleKind,
		road: Road,
		u: number,
		cruise: number,
		direction: 1 | -1
	) {
		const lane = -direction * LANE;
		const f = road.frameAt(u, lane);
		this.vehicles.push({
			index: this.vehicles.length,
			kind,
			object,
			road,
			u,
			cruise,
			speed: cruise,
			direction,
			offset: lane,
			targetOffset: lane,
			...VEHICLE_SIZE[kind],
			up: f.up,
			forward: f.forward.multiplyScalar(direction)
		});
	}

	getNearestAuto(playerPos: THREE.Vector3): { distance: number; speed: number } | null {
		let best: { distance: number; speed: number } | null = null;
		for (const v of this.vehicles) {
			if (v.kind !== 'auto') continue;
			const d = v.object.position.distanceTo(playerPos);
			if (!best || d < best.distance) {
				best = { distance: d, speed: v.speed };
			}
		}
		return best;
	}

	update(dt: number, playerDir: THREE.Vector3) {
		const playerOnRoad = new Map<Road, PlayerOnRoad>();
		for (const v of this.vehicles) {
			if (playerOnRoad.has(v.road)) continue;
			const now = v.road.project(playerDir);
			const prev = this.lastPlayer.get(v.road);
			// Player velocity in road coordinates, so drivers can anticipate where they're heading.
			const vAlong = prev ? (wrap(now.u - prev.u) * v.road.length) / Math.max(dt, 1e-4) : 0;
			const vOffset = prev ? (now.offset - prev.offset) / Math.max(dt, 1e-4) : 0;
			playerOnRoad.set(v.road, {
				...now,
				vAlong: THREE.MathUtils.clamp(vAlong, -8, 8),
				vOffset: THREE.MathUtils.clamp(vOffset, -8, 8)
			});
			this.lastPlayer.set(v.road, now);
		}

		for (const v of this.vehicles)
			this.drive(v, dt, this.obstaclesFor(v, playerOnRoad.get(v.road)!));
		this.colliders = this.vehicles.flatMap((v) => this.footprint(v));
	}

	private obstaclesFor(v: Vehicle, player: PlayerOnRoad): Obstacle[] {
		const obstacles: Obstacle[] = [];
		const len = v.road.length;

		// The player is treated as the strip they'll sweep over the next moment, not just a point,
		// and only matters when on (or about to step onto) the carriageway.
		const sweepOffset = player.vOffset * PREDICT_SECONDS;
		const sweepAlong = player.vAlong * PREDICT_SECONDS * v.direction;
		const nearestEdge = Math.min(Math.abs(player.offset), Math.abs(player.offset + sweepOffset));
		if (nearestEdge < ROAD_HALF_WIDTH + 0.6) {
			obstacles.push({
				along: wrap(player.u - v.u) * len * v.direction + sweepAlong / 2,
				offset: player.offset + sweepOffset / 2,
				halfLength: PLAYER_RADIUS + Math.abs(sweepAlong) / 2,
				halfWidth: PLAYER_RADIUS + Math.abs(sweepOffset) / 2,
				isPlayer: true,
				oncoming: false
			});
		}

		const rel = new THREE.Vector3();
		for (const o of this.vehicles) {
			if (o === v) continue;
			if (o.road === v.road) {
				obstacles.push({
					along: wrap(o.u - v.u) * len * v.direction,
					offset: o.offset,
					halfLength: o.halfLength,
					halfWidth: o.halfWidth,
					isPlayer: false,
					oncoming: o.direction !== v.direction
				});
			} else if (o.index < v.index) {
				// Cross traffic at junctions: the higher-index vehicle yields, so two drivers never wait on each other.
				rel.subVectors(o.object.position, v.object.position);
				const along = rel.dot(v.forward);
				if (Math.abs(along) > LOOK_AHEAD + v.halfLength + o.halfLength) continue;
				const right = new THREE.Vector3().crossVectors(v.forward, v.up);
				obstacles.push({
					along,
					offset: v.offset + rel.dot(right) * v.direction,
					halfLength: o.halfWidth,
					halfWidth: o.halfLength,
					isPlayer: false,
					oncoming: false
				});
			}
		}
		return obstacles;
	}

	private drive(v: Vehicle, dt: number, obstacles: Obstacle[]) {
		const lane = -v.direction * LANE;
		const maxOffset = ROAD_HALF_WIDTH - v.halfWidth - 0.08;
		const conflicts = (offset: number, ob: Obstacle) =>
			Math.abs(ob.offset - offset) < v.halfWidth + ob.halfWidth + SIDE_MARGIN;
		// Alongside or ahead within the look-ahead window.
		const near = (ob: Obstacle, reach = LOOK_AHEAD) =>
			ob.along > -(v.halfLength + ob.halfLength + 0.3) &&
			ob.along < v.halfLength + ob.halfLength + reach;
		// Can we drive at `offset` without meeting another vehicle (oncoming ones close fast, so look further)?
		const clearOfTraffic = (offset: number) =>
			obstacles.every(
				(ob) =>
					ob.isPlayer ||
					!conflicts(offset, ob) ||
					!near(ob, ob.oncoming ? LOOK_AHEAD * 2.5 : LOOK_AHEAD)
			);

		// --- Steering: swerve around the player if there's room -------------------
		const player = obstacles.find((ob) => ob.isPlayer && near(ob));
		let desired = lane;
		if (player && conflicts(lane, player)) {
			const keep =
				v.targetOffset !== lane &&
				!conflicts(v.targetOffset, player) &&
				clearOfTraffic(v.targetOffset);
			if (keep) desired = v.targetOffset;
			else {
				const need = v.halfWidth + player.halfWidth + SIDE_MARGIN + 0.05;
				const options = [player.offset - need, player.offset + need]
					.filter((o) => Math.abs(o) <= maxOffset)
					.sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane));
				desired = options.find(clearOfTraffic) ?? lane;
			}
		}
		// Don't pull back into the lane if another vehicle now occupies the way back.
		if (desired === lane && v.offset !== lane && !clearOfTraffic(lane) && clearOfTraffic(v.offset))
			desired = v.offset;
		v.targetOffset = desired;

		const prevOffset = v.offset;
		const step = LATERAL_SPEED * dt;
		v.offset += THREE.MathUtils.clamp(v.targetOffset - v.offset, -step, step);
		const lateralVelocity = (v.offset - prevOffset) / Math.max(dt, 1e-4);

		// --- Speed: ease off and stop for whatever blocks the path ----------------
		let target = v.cruise;
		let emergency = false;
		for (const ob of obstacles) {
			// Skip anything entirely behind the vehicle's centre.
			if (ob.along + ob.halfLength <= 0) continue;
			if (!conflicts(v.offset, ob) && !conflicts(v.targetOffset, ob)) continue;
			const gap = ob.along - v.halfLength - ob.halfLength;
			if (gap > LOOK_AHEAD) continue;
			if (gap < STOP_GAP * 0.5) emergency = true;
			target = Math.min(
				target,
				v.cruise * THREE.MathUtils.clamp((gap - STOP_GAP) / SLOW_ZONE, 0, 1)
			);
		}
		if (Math.abs(v.offset - lane) > 0.15) target = Math.min(target, v.cruise * 0.6);
		// Something stepped right in front: stand on the brakes.
		if (emergency) v.speed = 0;
		else
			v.speed =
				target < v.speed
					? Math.max(target, v.speed - BRAKE * dt)
					: Math.min(target, v.speed + ACCEL * dt);

		// --- Move & orient (nose turns slightly into lane changes) ------------------
		v.u += (v.direction * v.speed * dt) / v.road.length;
		const f = v.road.frameAt(v.u, v.offset);
		v.up.copy(f.up);
		v.forward
			.copy(f.forward)
			.multiplyScalar(v.direction * Math.max(v.speed, 0.8))
			.addScaledVector(f.right, lateralVelocity)
			.normalize();
		placeOnSurface(v.object, v.up, v.forward, ROAD_HEIGHT);
	}

	/** Row of circles covering the vehicle's footprint. */
	private footprint(v: Vehicle): Circle[] {
		const r = v.halfWidth;
		const span = Math.max(0, v.halfLength - r);
		const n = Math.max(1, Math.ceil((2 * span) / r) + 1);
		const circles: Circle[] = [];
		for (let i = 0; i < n; i++) {
			const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * 2 * span;
			circles.push({ dir: stepAlong(v.up, v.forward, t), radius: r });
		}
		return circles;
	}
}
