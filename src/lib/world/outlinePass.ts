import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { PALETTE } from './constants';

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
uniform vec3 uSkyBottom;
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

vec3 sky(vec2 uv) {
	vec2 p = uv * vec2(uResolution.x / uResolution.y, 1.0);
	vec3 c = mix(uSkyBottom, uSkyTop, smoothstep(0.0, 1.0, uv.y));
	float blot = noise(p * 3.0 + vec2(uTime * 0.01, 0.0)) * 0.6 + noise(p * 9.0) * 0.4;
	return mix(c, c * 1.05 + 0.02, smoothstep(0.55, 0.7, blot));
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

		// Atmospheric haze towards the sky colour.
		col = mix(col, skyCol, smoothstep(18.0, 60.0, z0) * 0.35);
		col = mix(col, uOutline, edge * 0.92);
	}

	// Paper grain + soft vignette
	col += (hash(vUv * uResolution) - 0.5) * 0.018;
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
				uSkyBottom: { value: new THREE.Color(PALETTE.skyBottom) }
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

	render(time: number) {
		const { renderer, scene, camera } = this;
		this.material.uniforms.uTime.value = time;

		renderer.setRenderTarget(this.colorTarget);
		renderer.clear();
		renderer.render(scene, camera);

		// Normals pass: reuse this frame's shadow map instead of re-rendering it.
		const autoUpdate = renderer.shadowMap.autoUpdate;
		renderer.shadowMap.autoUpdate = false;
		scene.overrideMaterial = this.normalMaterial;
		renderer.setRenderTarget(this.normalTarget);
		renderer.clear();
		renderer.render(scene, camera);
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
