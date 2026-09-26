import * as THREE from 'three';

/** Display name of the quest building and the company on the staffer's shirt. */
export const COMPANY_NAME = 'ANAKIN';

interface TextOptions {
	color?: string;
	background?: string | null;
	font?: string;
	/** Canvas pixels per world metre — higher = crisper. */
	resolution?: number;
	/** Rounded background corners (in canvas px). */
	radius?: number;
	/** Optional outline around the letters. */
	stroke?: string;
}

const textures: THREE.Texture[] = [];

/**
 * A flat, unlit text panel (w × h metres) facing +Z. Unlit so signs stay readable in shade and
 * glow gently at night like real shop signs.
 */
export function textPanel(text: string, w: number, h: number, opts: TextOptions = {}): THREE.Mesh {
	const res = opts.resolution ?? 128;
	const canvas = document.createElement('canvas');
	canvas.width = Math.max(2, Math.round(w * res));
	canvas.height = Math.max(2, Math.round(h * res));
	const ctx = canvas.getContext('2d')!;

	if (opts.background) {
		ctx.fillStyle = opts.background;
		const r = opts.radius ?? 0;
		ctx.beginPath();
		ctx.roundRect(0, 0, canvas.width, canvas.height, r);
		ctx.fill();
	}

	const lines = text.split('\n');
	let size = canvas.height / lines.length;
	const family = opts.font ?? '"Bungee", "Arial Black", sans-serif';
	ctx.font = `${size * 0.7}px ${family}`;
	const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
	if (widest > canvas.width * 0.9) size *= (canvas.width * 0.9) / widest;
	ctx.font = `${size * 0.7}px ${family}`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	lines.forEach((line, i) => {
		const y = (canvas.height / lines.length) * (i + 0.5);
		if (opts.stroke) {
			ctx.lineWidth = size * 0.08;
			ctx.strokeStyle = opts.stroke;
			ctx.strokeText(line, canvas.width / 2, y);
		}
		ctx.fillStyle = opts.color ?? '#ffffff';
		ctx.fillText(line, canvas.width / 2, y);
	});

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = 4;
	textures.push(texture);
	const material = new THREE.MeshBasicMaterial({
		map: texture,
		transparent: !opts.background,
		alphaTest: opts.background ? 0 : 0.2
	});
	return new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
}

/** Canvas fonts load lazily; call once the web font is ready so signs don't fall back. */
export async function fontsReady(): Promise<void> {
	if (typeof document === 'undefined' || !document.fonts) return;
	await document.fonts.load('64px "Bungee"').catch(() => undefined);
}

export function disposeSignTextures() {
	textures.forEach((t) => t.dispose());
	textures.length = 0;
}
