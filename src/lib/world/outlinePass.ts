import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { PALETTE } from './constants';
import type { Lighting } from './dayCycle';

/** Objects on this layer (additive light pools) render in colour only — no outlines. */
export const GLOW_LAYER = 1;

const OUTLINE_DAY = new THREE.Color(PALETTE.outline);
const OUTLINE_NIGHT = new THREE.Color('#070914');

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// Ink outlines from depth + normal discontinuities (same idea as Messenger's post pass),
// with a slightly wobbly line width for a hand-drawn feel, watercolour sky, haze and grain.
const fragmentShader = /* glsl */ `
#include <packing>
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tNormal;
uniform vec2 uResolution;
uniform float uNear;
uniform float uFar;
uniform float uThickness;
uniform float uTime;
uniform vec2 uFade;
uniform vec3 uOutline;
uniform vec3 uSkyTop;
uniform vec3 uSkyMid;
uniform vec3 uSkyBottom;
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform vec3 uUp;
uniform vec3 uSunDir;
uniform vec3 uGlow;
uniform float uGlowStrength;
uniform float uNight;
uniform vec3 uGrade;
uniform float uTransition;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float rawDepth(vec2 uv) { return texture2D(tDepth, uv).x; }
float linearDepth(float d) { return -perspectiveDepthToViewZ(d, uNear, uFar); }
vec3 normalAt(vec2 uv) { return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }

// World-space view ray for this pixel, so the sky gradient, sun and stars stay put as the camera orbits.
vec3 viewRay(vec2 uv) {
	vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
	return normalize((uCamWorld * vec4(normalize(v.xyz / v.w), 0.0)).xyz);
}

vec3 sky(vec2 uv) {
	vec3 ray = viewRay(uv);
	// Blend of screen height and height above the local horizon: the camera usually looks down at the
	// planet, so nearly all visible sky is near the horizon — screen height lets the upper bands show.
	float h = uv.y * 0.8 + dot(ray, uUp) * 0.5;
	vec3 c = mix(uSkyBottom, uSkyMid, smoothstep(-0.05, 0.3, h));
	c = mix(c, uSkyTop, smoothstep(0.3, 0.85, h));

	// Soft watercolour blotches
	vec2 p = uv * vec2(uResolution.x / uResolution.y, 1.0);
	float blot = noise(p * 3.0 + vec2(uTime * 0.01, 0.0)) * 0.6 + noise(p * 9.0) * 0.4;
	c = mix(c, c * 1.05 + 0.02, smoothstep(0.55, 0.7, blot));

	// Sun glow: wide pink/gold bloom plus a bright core; the same disc becomes a pale moon at night.
	float s = max(dot(ray, uSunDir), 0.0);
	c += uGlow * uGlowStrength * (pow(s, 3.0) * 0.45 + pow(s, 24.0) * 0.5);
	float disc = smoothstep(0.9990, 0.9994, s);
	c = mix(c, mix(vec3(1.0, 0.93, 0.85), vec3(0.93, 0.95, 1.0), uNight), disc * max(uGlowStrength, uNight));

	// Stars: hashed cells on the celestial sphere, twinkling, fading in with night.
	if (uNight > 0.01) {
		vec3 q = ray * 90.0;
		vec3 cell = floor(q);
		float r = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
		float star = step(0.985, r) * smoothstep(0.45, 0.0, length(fract(q) - 0.5));
		float twinkle = 0.6 + 0.4 * sin(uTime * 2.0 + r * 50.0);
		c += vec3(1.0, 0.97, 0.9) * star * twinkle * uNight * smoothstep(0.0, 0.25, h);
	}
	return c;
}

void main() {
	float d0 = rawDepth(vUv);
	vec3 skyCol = sky(vUv);
	vec3 col;

	if (d0 >= 1.0) {
		col = skyCol;
	} else {
		col = texture2D(tColor, vUv).rgb;
		float z0 = linearDepth(d0);
		vec3 n0 = normalAt(vUv);

		// Wobbly width: thicker and thinner along the stroke.
		float wobble = noise(vUv * uResolution / 35.0);
		vec2 px = uThickness * (0.55 + 0.9 * wobble) / uResolution;

		float depthEdge = 0.0;
		float normalEdge = 0.0;
		vec2 dirs[4];
		dirs[0] = vec2(1, 0); dirs[1] = vec2(-1, 0); dirs[2] = vec2(0, 1); dirs[3] = vec2(0, -1);
		// Grazing surfaces change depth quickly without being edges — loosen the threshold there.
		float threshold = 0.035 / max(abs(n0.z), 0.2);
		for (int i = 0; i < 4; i++) {
			vec2 uv = vUv + dirs[i] * px;
			float d = rawDepth(uv);
			float z = d >= 1.0 ? uFar : linearDepth(d);
			depthEdge = max(depthEdge, smoothstep(threshold, threshold * 2.0, (z - z0) / z0));
			if (d < 1.0) normalEdge = max(normalEdge, smoothstep(0.35, 0.6, 1.0 - dot(n0, normalAt(uv))));
		}
		float edge = max(depthEdge, normalEdge);
		edge *= 1.0 - smoothstep(uFade.x, uFade.y, z0);

		// Time-of-day colour grade (sunset pink, night blue), then haze towards the sky colour.
		col *= uGrade;
		col = mix(col, skyCol, smoothstep(18.0, 60.0, z0) * 0.35);
		col = mix(col, uOutline, edge * 0.92);
	}

	// Brief fade through deep blue when the day wraps from 8 PM back to 8 AM.
	col = mix(col, vec3(0.02, 0.03, 0.07), uTransition);

	// Paper grain + soft vignette
	col *= 1.0 + (hash(vUv * uResolution) - 0.5) * 0.035; // multiplicative so dark night tones stay clean
	vec2 v = vUv - 0.5;
	col *= 1.0 - dot(v, v) * 0.25;

	gl_FragColor = vec4(col, 1.0);
	#include <colorspace_fragment>
}`;

/** Renders the scene to colour/depth + normal targets, then composites the ink-outline pass. */
export class OutlineRenderer {
	private readonly colorTarget: THREE.WebGLRenderTarget;
	private readonly normalTarget: THREE.WebGLRenderTarget;
	private readonly normalMaterial = new THREE.MeshNormalMaterial();
	private readonly material: THREE.ShaderMaterial;
	private readonly quad: FullScreenQuad;

	constructor(
		private readonly renderer: THREE.WebGLRenderer,
		private readonly scene: THREE.Scene,
		private readonly camera: THREE.PerspectiveCamera
	) {
		this.colorTarget = new THREE.WebGLRenderTarget(1, 1, {
			type: THREE.HalfFloatType,
			samples: 4,
			depthTexture: new THREE.DepthTexture(1, 1)
		});
		this.normalTarget = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
		this.material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			depthTest: false,
			depthWrite: false,
			uniforms: {
				tColor: { value: this.colorTarget.texture },
				tDepth: { value: this.colorTarget.depthTexture },
				tNormal: { value: this.normalTarget.texture },
				uResolution: { value: new THREE.Vector2(1, 1) },
				uNear: { value: camera.near },
				uFar: { value: camera.far },
				uThickness: { value: 1.6 },
				uTime: { value: 0 },
				uFade: { value: new THREE.Vector2(30, 70) },
				uOutline: { value: new THREE.Color(PALETTE.outline) },
				uSkyTop: { value: new THREE.Color(PALETTE.skyTop) },
				uSkyMid: { value: new THREE.Color(PALETTE.skyTop) },
				uSkyBottom: { value: new THREE.Color(PALETTE.skyBottom) },
				uInvProj: { value: new THREE.Matrix4() },
				uCamWorld: { value: new THREE.Matrix4() },
				uUp: { value: new THREE.Vector3(0, 1, 0) },
				uSunDir: { value: new THREE.Vector3(0, 1, 0) },
				uGlow: { value: new THREE.Color() },
				uGlowStrength: { value: 0 },
				uNight: { value: 0 },
				uGrade: { value: new THREE.Color(1, 1, 1) },
				uTransition: { value: 0 }
			}
		});
		this.quad = new FullScreenQuad(this.material);
	}

	setSize(width: number, height: number) {
		const dpr = this.renderer.getPixelRatio();
		const w = Math.floor(width * dpr);
		const h = Math.floor(height * dpr);
		this.colorTarget.setSize(w, h);
		this.normalTarget.setSize(w, h);
		this.material.uniforms.uResolution.value.set(w, h);
		// Keep stroke width visually similar on high-DPI screens.
		this.material.uniforms.uThickness.value = 1.6 * dpr;
	}

	private dayTransition = 0;
	/** Extra fade-to-dark used for scene changes (entering/leaving buildings, stairs). */
	fade = 0;

	/** Indoor backdrop: a warm dark void behind the cutaway floor, no sun/stars/grade. */
	setIndoor(up: THREE.Vector3) {
		const u = this.material.uniforms;
		u.uSkyTop.value.set('#1d1b2e');
		u.uSkyMid.value.set('#2a2740');
		u.uSkyBottom.value.set('#3a3552');
		u.uGlowStrength.value = 0;
		u.uNight.value = 0;
		u.uGrade.value.setRGB(1, 1, 1);
		u.uOutline.value.copy(OUTLINE_DAY);
		u.uUp.value.copy(up);
		this.dayTransition = 0;
	}

	/** Per-frame sky/lighting inputs from the day cycle. */
	setSky(l: Lighting, up: THREE.Vector3, sunDir: THREE.Vector3) {
		const u = this.material.uniforms;
		u.uSkyTop.value.copy(l.skyTop);
		u.uSkyMid.value.copy(l.skyMid);
		u.uSkyBottom.value.copy(l.skyBottom);
		u.uGlow.value.copy(l.glow);
		u.uGlowStrength.value = l.glowStrength;
		u.uNight.value = l.night;
		u.uGrade.value.copy(l.grade);
		this.dayTransition = l.transition;
		// Ink goes deep navy at night so lines stay darker than the moonlit surfaces.
		u.uOutline.value.copy(OUTLINE_DAY).lerp(OUTLINE_NIGHT, l.night);
		u.uUp.value.copy(up);
		u.uSunDir.value.copy(sunDir);
	}

	/** Renders `scene` through the outline pipeline (defaults to the world scene/camera). */
	render(
		time: number,
		scene: THREE.Scene = this.scene,
		camera: THREE.PerspectiveCamera = this.camera
	) {
		const { renderer } = this;
		const u = this.material.uniforms;
		u.uTime.value = time;
		u.uTransition.value = Math.max(this.dayTransition, this.fade);
		u.uNear.value = camera.near;
		u.uFar.value = camera.far;
		u.uInvProj.value.copy(camera.projectionMatrixInverse);
		u.uCamWorld.value.copy(camera.matrixWorld);

		renderer.setRenderTarget(this.colorTarget);
		renderer.clear();
		renderer.render(scene, camera);

		// Normals pass: reuse this frame's shadow map instead of re-rendering it.
		const autoUpdate = renderer.shadowMap.autoUpdate;
		renderer.shadowMap.autoUpdate = false;
		// Glow decals (GLOW_LAYER) are colour-only: keep them out of the normals so they get no ink lines.
		scene.overrideMaterial = this.normalMaterial;
		camera.layers.disable(GLOW_LAYER);
		renderer.setRenderTarget(this.normalTarget);
		renderer.clear();
		renderer.render(scene, camera);
		camera.layers.enable(GLOW_LAYER);
		scene.overrideMaterial = null;
		renderer.shadowMap.autoUpdate = autoUpdate;

		renderer.setRenderTarget(null);
		this.quad.render(renderer);
	}

	dispose() {
		this.colorTarget.depthTexture?.dispose();
		this.colorTarget.dispose();
		this.normalTarget.dispose();
		this.normalMaterial.dispose();
		this.material.dispose();
		this.quad.dispose();
	}
}
