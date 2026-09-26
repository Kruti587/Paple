/** 50 m diameter planet. All world units are metres. */
export const PLANET_RADIUS = 25;

export const ROAD_HALF_WIDTH = 1.7;
/** Red-earth shoulder / footpath beyond the kerb. */
export const FOOTPATH_WIDTH = 1.4;

/**
 * Muted, painterly palette in the spirit of messenger.abeto.co,
 * with Bengaluru accents (jacaranda, gulmohar, green-yellow autos, laterite soil).
 */
export const PALETTE = {
	skyTop: '#7fc4c6',
	skyBottom: '#cfe7d9',
	outline: '#363a3c',

	grass: '#86ad5c',
	grassDark: '#6a9448',
	grassDry: '#a8b667',
	laterite: '#b8704e',
	lateriteLight: '#c98a63',
	asphalt: '#6c7073',
	laneMark: '#ece6d4',
	kerbYellow: '#e9c443',
	kerbBlack: '#34383a',
	sand: '#d8c49a',
	water: '#63adc0',
	waterLight: '#9fd3dc',

	trunk: '#6d4c38',
	rainTree: '#5f8f48',
	rainTreeLight: '#77a454',
	jacaranda: '#a488db',
	gulmohar: '#e2613b',
	tabebuia: '#f0a5c6',
	palmLeaf: '#6f9c43',
	coconut: '#8a6a3a',
	bush: '#4f7f3f',

	houses: ['#e8a5a0', '#7cc7c0', '#eed27a', '#b9a5d6', '#a9d8b1', '#f2b58a', '#efe9dd', '#9cc2e6'],
	shutters: ['#3d7fc4', '#d9534f', '#4caf7a', '#f0ad4e'],
	roofTile: '#bf5a3a',
	parapet: '#f3eee4',
	window: '#3e4a52',
	door: '#7a4e32',
	waterTank: '#2c2f33',

	stone: '#ddd5c4',
	stoneShade: '#c7bea9',
	gold: '#e8b93a',
	templeOchre: '#e0a85a',
	templeRed: '#c8553d',
	templeBlue: '#4f8fc0',
	templeGreen: '#5ba16a',

	autoGreen: '#3f8f4a',
	autoYellow: '#f2c230',
	tyre: '#2a2c2e',
	metal: '#9aa3a8',
	tarpBlue: '#3d7fc4',
	wood: '#8b5e3c',
	cowWhite: '#efebe2',
	skin: '#c68b62',
	cloud: '#ffffff'
} as const;
