import * as THREE from 'three';

/** One in-game day runs 8 AM → 8 PM (12 hours) over 30 real minutes, then a new day begins. */
export const CYCLE_SECONDS = 30 * 60;
export const START_HOUR = 8;
export const SPAN_HOURS = 12;

interface Keyframe {
	hour: number;
	skyTop: string;
	skyMid: string;
	skyBottom: string;
	sun: string;
	sunIntensity: number;
	ambient: string;
	ambientIntensity: number;
	/** Multiplied into the final image — used to wash the scene in sunset pink / night blue. */
	grade: string;
	/** Sun elevation in degrees (negative once set; the moon takes over). */
	elevation: number;
	/** Glow around the sun in the sky. */
	glow: string;
	glowStrength: number;
	/** 0 = day … 1 = full night (stars, lit windows, street lamps, headlights). */
	night: number;
}

// Tuned by eye. Bengaluru sunset is ~6:25 PM; the pink hour straddles it.
const KEYFRAMES: Keyframe[] = [
	{
		hour: 8.0,
		skyTop: '#86c9dc',
		skyMid: '#b9e0e0',
		skyBottom: '#f6e3c4',
		sun: '#ffe9c7',
		sunIntensity: 1.8,
		ambient: '#e3ecff',
		ambientIntensity: 1.2,
		grade: '#fff8ef',
		elevation: 25,
		glow: '#fff1c9',
		glowStrength: 0.35,
		night: 0
	},
	{
		hour: 10.5,
		skyTop: '#7fc4c6',
		skyMid: '#a8d8d4',
		skyBottom: '#d8ecdc',
		sun: '#fff4e0',
		sunIntensity: 2.1,
		ambient: '#ffffff',
		ambientIntensity: 1.35,
		grade: '#ffffff',
		elevation: 55,
		glow: '#fffbe8',
		glowStrength: 0.2,
		night: 0
	},
	{
		hour: 14.5,
		skyTop: '#7fc4c6',
		skyMid: '#a8d8d4',
		skyBottom: '#d8ecdc',
		sun: '#fff4e0',
		sunIntensity: 2.1,
		ambient: '#ffffff',
		ambientIntensity: 1.35,
		grade: '#ffffff',
		elevation: 58,
		glow: '#fffbe8',
		glowStrength: 0.2,
		night: 0
	},
	{
		hour: 16.5,
		skyTop: '#80bcd6',
		skyMid: '#b6d6d6',
		skyBottom: '#f4dcb0',
		sun: '#ffe2b5',
		sunIntensity: 2.0,
		ambient: '#fff2e2',
		ambientIntensity: 1.3,
		grade: '#fff6ea',
		elevation: 32,
		glow: '#ffe7b8',
		glowStrength: 0.35,
		night: 0
	},
	// Golden hour
	{
		hour: 17.6,
		skyTop: '#93b3da',
		skyMid: '#f2c6b8',
		skyBottom: '#ffcf9e',
		sun: '#ffb877',
		sunIntensity: 1.8,
		ambient: '#ffdcca',
		ambientIntensity: 1.2,
		grade: '#fff0e2',
		elevation: 14,
		glow: '#ffc98a',
		glowStrength: 0.6,
		night: 0
	},
	// Pink sunset
	{
		hour: 18.2,
		skyTop: '#a58ad6',
		skyMid: '#f79cc8',
		skyBottom: '#ffb3c1',
		sun: '#ff9db5',
		sunIntensity: 1.35,
		ambient: '#f7c0dc',
		ambientIntensity: 1.1,
		grade: '#ffe4f0',
		elevation: 4,
		glow: '#ffa6c9',
		glowStrength: 1.0,
		night: 0.05
	},
	{
		hour: 18.55,
		skyTop: '#7a6fc0',
		skyMid: '#ee8cc4',
		skyBottom: '#ff9fb8',
		sun: '#f27aa8',
		sunIntensity: 0.85,
		ambient: '#dba7d6',
		ambientIntensity: 0.95,
		grade: '#fbdcef',
		elevation: -1,
		glow: '#ff90c0',
		glowStrength: 0.9,
		night: 0.3
	},
	// Dusk
	{
		hour: 18.9,
		skyTop: '#3f4a8e',
		skyMid: '#a86aa8',
		skyBottom: '#e58aa8',
		sun: '#b58ad0',
		sunIntensity: 0.45,
		ambient: '#9c8fcc',
		ambientIntensity: 0.8,
		grade: '#e4d4f2',
		elevation: -4,
		glow: '#d97fb0',
		glowStrength: 0.45,
		night: 0.65
	},
	{
		hour: 19.3,
		skyTop: '#1f2658',
		skyMid: '#3f3f84',
		skyBottom: '#7a5c9c',
		sun: '#9fb4ff',
		sunIntensity: 0.35,
		ambient: '#6d78b4',
		ambientIntensity: 0.65,
		grade: '#c9cff5',
		elevation: -8,
		glow: '#8a7fc0',
		glowStrength: 0.15,
		night: 0.9
	},
	// Night (moonlight)
	{
		hour: 20.0,
		skyTop: '#0f1433',
		skyMid: '#1c2350',
		skyBottom: '#34386e',
		sun: '#9fb4ff',
		sunIntensity: 0.4,
		ambient: '#5a68a8',
		ambientIntensity: 0.6,
		grade: '#b9c4f2',
		elevation: -10,
		glow: '#6f78b8',
		glowStrength: 0,
		night: 1
	}
];

export interface Lighting {
	hour: number;
	skyTop: THREE.Color;
	skyMid: THREE.Color;
	skyBottom: THREE.Color;
	sun: THREE.Color;
	sunIntensity: number;
	ambient: THREE.Color;
	ambientIntensity: number;
	grade: THREE.Color;
	elevation: number;
	glow: THREE.Color;
	glowStrength: number;
	night: number;
	/** 0 → 1: sweep of the sun across the sky over the day (drives azimuth). */
	dayProgress: number;
	/** Fade to dark around the 8 PM → 8 AM wrap so the new day doesn't pop. */
	transition: number;
}

const COLOR_KEYS = ['skyTop', 'skyMid', 'skyBottom', 'sun', 'ambient', 'grade', 'glow'] as const;
const NUMBER_KEYS = [
	'sunIntensity',
	'ambientIntensity',
	'elevation',
	'glowStrength',
	'night'
] as const;

const cache = new Map<string, THREE.Color>();
const color = (hex: string) => {
	let c = cache.get(hex);
	if (!c) cache.set(hex, (c = new THREE.Color(hex)));
	return c;
};

/** Game hour (8…20) for a given elapsed real time in seconds. */
export function hourAt(seconds: number): number {
	const t = (((seconds / CYCLE_SECONDS) % 1) + 1) % 1;
	return START_HOUR + t * SPAN_HOURS;
}

export function sampleLighting(hour: number, out?: Lighting): Lighting {
	const h = THREE.MathUtils.clamp(hour, KEYFRAMES[0].hour, KEYFRAMES[KEYFRAMES.length - 1].hour);
	let i = 0;
	while (i < KEYFRAMES.length - 2 && h > KEYFRAMES[i + 1].hour) i++;
	const a = KEYFRAMES[i];
	const b = KEYFRAMES[i + 1];
	const t = THREE.MathUtils.smoothstep(h, a.hour, b.hour);

	const res =
		out ??
		({
			skyTop: new THREE.Color(),
			skyMid: new THREE.Color(),
			skyBottom: new THREE.Color(),
			sun: new THREE.Color(),
			ambient: new THREE.Color(),
			grade: new THREE.Color(),
			glow: new THREE.Color()
		} as Lighting);
	for (const k of COLOR_KEYS) res[k].copy(color(a[k])).lerp(color(b[k]), t);
	for (const k of NUMBER_KEYS) res[k] = THREE.MathUtils.lerp(a[k], b[k], t);
	res.hour = hour;
	res.dayProgress = (hour - START_HOUR) / SPAN_HOURS;
	const end = START_HOUR + SPAN_HOURS;
	res.transition = Math.max(
		THREE.MathUtils.smoothstep(hour, end - 0.12, end),
		1 - THREE.MathUtils.smoothstep(hour, START_HOUR, START_HOUR + 0.12)
	);
	return res;
}

/** "6:42 PM" */
export function formatClock(hour: number): string {
	const h = Math.floor(hour);
	const m = Math.floor((hour - h) * 60);
	const h12 = ((h + 11) % 12) + 1;
	return `${h12}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
