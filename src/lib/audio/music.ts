// Background music with two tracks:
//  - 'lofi': the team's lofi loop (static/lofi.mp3), streamed only once music is first turned on.
//  - 'generated' ("Namma Beats"): procedural Web Audio — a tanpura drone, a plucked sitar-like
//    melody wandering over the Bhupali pentatonic scale, and soft tabla-style beats.

export type Track = 'lofi' | 'generated';
export const TRACK_NAMES: Record<Track, string> = { lofi: 'Lofi', generated: 'Namma Beats' };

const STORAGE_KEY = 'paple.music';
const TRACK_KEY = 'paple.track';
const LOFI_URL = '/lofi.mp3';
const LOFI_VOLUME = 0.6;
const BPM = 84;
const BEAT = 60 / BPM;
const SA = 138.59; // C#3 — a common tanpura pitch
// Bhupali: Sa Re Ga Pa Dha (semitones from Sa), across two octaves.
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
const LOOKAHEAD = 0.15;

const hz = (semitones: number, base = SA) => base * Math.pow(2, semitones / 12);

export function loadMusicPref(): boolean {
	if (typeof localStorage === 'undefined') return true;
	return localStorage.getItem(STORAGE_KEY) !== 'off';
}

export function saveMusicPref(on: boolean) {
	if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
}

export function loadTrackPref(): Track {
	if (typeof localStorage === 'undefined') return 'lofi';
	return localStorage.getItem(TRACK_KEY) === 'generated' ? 'generated' : 'lofi';
}

export function saveTrackPref(track: Track) {
	if (typeof localStorage !== 'undefined') localStorage.setItem(TRACK_KEY, track);
}

export class Music {
	private ctx: AudioContext | null = null;
	private master!: GainNode;
	private bus!: GainNode;
	private timer: ReturnType<typeof setInterval> | null = null;
	private nextBeat = 0;
	private beat = 0;
	private melodyIndex = 4;
	private enabled = false;
	private track: Track = 'lofi';
	private lofi: HTMLAudioElement | null = null;
	private lofiFade: ReturnType<typeof setInterval> | null = null;

	/** Must be called from a user gesture (browsers block audio until then). */
	async setEnabled(on: boolean) {
		this.enabled = on;
		if (this.track === 'lofi') await this.setLofi(on);
		else await this.setGenerated(on);
	}

	/** Switch tracks, cross-fading if music is playing. */
	async setTrack(track: Track) {
		if (track === this.track) return;
		const playing = this.enabled;
		if (playing) {
			if (this.track === 'lofi') await this.setLofi(false);
			else await this.setGenerated(false);
		}
		this.track = track;
		if (playing) await this.setEnabled(true);
	}

	private async setLofi(on: boolean) {
		if (on && !this.lofi) {
			this.lofi = new Audio(LOFI_URL);
			this.lofi.loop = true;
			this.lofi.volume = 0;
		}
		const el = this.lofi;
		if (!el) return;
		if (this.lofiFade) clearInterval(this.lofiFade);
		if (on) await el.play().catch(() => undefined);
		const target = on ? LOFI_VOLUME : 0;
		this.lofiFade = setInterval(() => {
			const next = el.volume + Math.sign(target - el.volume) * 0.04;
			el.volume = Math.min(1, Math.max(0, Math.abs(target - next) < 0.04 ? target : next));
			if (el.volume === target) {
				clearInterval(this.lofiFade!);
				this.lofiFade = null;
				if (!on) el.pause();
			}
		}, 40);
	}

	private async setGenerated(on: boolean) {
		if (on) {
			this.ensureContext();
			await this.ctx!.resume();
			if (!this.timer) this.startScheduler();
			this.master.gain.cancelScheduledValues(this.ctx!.currentTime);
			this.master.gain.setTargetAtTime(0.55, this.ctx!.currentTime, 0.6);
		} else if (this.ctx) {
			this.master.gain.cancelScheduledValues(this.ctx.currentTime);
			this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
			const ctx = this.ctx;
			setTimeout(() => {
				// Idle the audio engine when music is off or we've switched to the lofi track.
				if ((!this.enabled || this.track !== 'generated') && ctx.state === 'running')
					void ctx.suspend();
			}, 1200);
		}
	}

	dispose() {
		if (this.lofiFade) clearInterval(this.lofiFade);
		this.lofi?.pause();
		this.lofi = null;
		if (this.timer) clearInterval(this.timer);
		this.timer = null;
		void this.ctx?.close();
		this.ctx = null;
	}

	private ensureContext() {
		if (this.ctx) return;
		const ctx = new AudioContext();
		this.ctx = ctx;
		this.master = ctx.createGain();
		this.master.gain.value = 0;
		this.master.connect(ctx.destination);

		// Shared room: a short generated reverb + a gentle echo.
		this.bus = ctx.createGain();
		const dry = ctx.createGain();
		dry.gain.value = 0.8;
		const reverb = ctx.createConvolver();
		reverb.buffer = impulse(ctx, 2.4);
		const wet = ctx.createGain();
		wet.gain.value = 0.35;
		const delay = ctx.createDelay(1);
		delay.delayTime.value = BEAT * 0.75;
		const feedback = ctx.createGain();
		feedback.gain.value = 0.28;
		const delayOut = ctx.createGain();
		delayOut.gain.value = 0.25;
		this.bus.connect(dry).connect(this.master);
		this.bus.connect(reverb).connect(wet).connect(this.master);
		this.bus.connect(delay);
		delay.connect(feedback).connect(delay);
		delay.connect(delayOut).connect(this.master);
	}

	private startScheduler() {
		this.nextBeat = this.ctx!.currentTime + 0.1;
		this.timer = setInterval(() => {
			const ctx = this.ctx;
			if (!ctx) return;
			while (this.nextBeat < ctx.currentTime + LOOKAHEAD) {
				this.scheduleBeat(this.beat, this.nextBeat);
				this.nextBeat += BEAT / 2; // eighth notes
				this.beat++;
			}
		}, 25);
	}

	private scheduleBeat(step: number, t: number) {
		const bar = 16; // 8 beats of eighths
		const inBar = step % bar;

		// Tanpura: Pa - Sa' - Sa' - Sa (low), one pluck per beat, long ringing tails.
		if (inBar % 2 === 0) {
			const pattern = [-5, 12, 12, 0];
			this.tanpura(hz(pattern[(inBar / 2) % 4], SA / 2), t);
		}

		// Tabla-ish: bayan (low) on 1 and the "and" of 3, dayan (tak) on the offbeats.
		if (inBar === 0 || inBar === 6 || inBar === 10) this.bayan(t, inBar === 0 ? 0.55 : 0.35);
		if (inBar % 4 === 2 || inBar === 13 || inBar === 15) this.tak(t, inBar === 13 ? 0.12 : 0.2);

		// Melody: sparse phrases, rest every other bar so it breathes.
		const phraseBar = Math.floor(step / bar) % 4;
		if (phraseBar !== 3 && inBar % 2 === 0 && Math.random() < 0.62) {
			const stepSize = [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
			this.melodyIndex = Math.max(0, Math.min(SCALE.length - 1, this.melodyIndex + stepSize));
			// Gravitate home to Sa / Pa at phrase ends.
			if (inBar === 14) this.melodyIndex = Math.random() < 0.5 ? 5 : 3;
			const long = inBar === 14 || Math.random() < 0.25;
			this.pluck(hz(SCALE[this.melodyIndex], SA), t, long ? BEAT * 1.8 : BEAT * 0.9);
		}
	}

	private tanpura(freq: number, t: number) {
		const ctx = this.ctx!;
		const out = ctx.createGain();
		out.gain.setValueAtTime(0, t);
		out.gain.linearRampToValueAtTime(0.07, t + 0.05);
		out.gain.exponentialRampToValueAtTime(0.001, t + BEAT * 3.5);
		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.value = 1400;
		filter.Q.value = 3; // the buzzy "jawari" shimmer
		filter.connect(out).connect(this.bus);
		for (const detune of [-4, 4]) {
			const o = ctx.createOscillator();
			o.type = 'sawtooth';
			o.frequency.value = freq;
			o.detune.value = detune;
			o.connect(filter);
			o.start(t);
			o.stop(t + BEAT * 3.6);
		}
	}

	private pluck(freq: number, t: number, length: number) {
		const ctx = this.ctx!;
		const out = ctx.createGain();
		out.gain.setValueAtTime(0, t);
		out.gain.linearRampToValueAtTime(0.16, t + 0.008);
		out.gain.exponentialRampToValueAtTime(0.001, t + length);
		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(4200, t);
		filter.frequency.exponentialRampToValueAtTime(900, t + length * 0.6);
		filter.connect(out).connect(this.bus);
		const o = ctx.createOscillator();
		o.type = 'triangle';
		// Meend: a small slide into the note, like a sitar string being pulled.
		o.frequency.setValueAtTime(freq * 0.97, t);
		o.frequency.exponentialRampToValueAtTime(freq, t + 0.06);
		const o2 = ctx.createOscillator();
		o2.type = 'sawtooth';
		o2.frequency.value = freq * 2;
		const g2 = ctx.createGain();
		g2.gain.value = 0.18;
		o.connect(filter);
		o2.connect(g2).connect(filter);
		o.start(t);
		o2.start(t);
		o.stop(t + length + 0.05);
		o2.stop(t + length + 0.05);
	}

	private bayan(t: number, level: number) {
		const ctx = this.ctx!;
		const o = ctx.createOscillator();
		o.type = 'sine';
		o.frequency.setValueAtTime(120, t);
		o.frequency.exponentialRampToValueAtTime(62, t + 0.35);
		const g = ctx.createGain();
		g.gain.setValueAtTime(level, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
		o.connect(g).connect(this.bus);
		o.start(t);
		o.stop(t + 0.55);
	}

	private tak(t: number, level: number) {
		const ctx = this.ctx!;
		const noise = ctx.createBufferSource();
		noise.buffer = noiseBuffer(ctx);
		const band = ctx.createBiquadFilter();
		band.type = 'bandpass';
		band.frequency.value = 2400;
		band.Q.value = 2;
		const g = ctx.createGain();
		g.gain.setValueAtTime(level, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
		const ring = ctx.createOscillator();
		ring.frequency.value = 560;
		const rg = ctx.createGain();
		rg.gain.setValueAtTime(level * 0.6, t);
		rg.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
		noise.connect(band).connect(g).connect(this.bus);
		ring.connect(rg).connect(this.bus);
		noise.start(t);
		noise.stop(t + 0.1);
		ring.start(t);
		ring.stop(t + 0.16);
	}
}

let noiseCache: AudioBuffer | null = null;
function noiseBuffer(ctx: AudioContext): AudioBuffer {
	if (noiseCache && noiseCache.sampleRate === ctx.sampleRate) return noiseCache;
	const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
	const data = buf.getChannelData(0);
	for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
	return (noiseCache = buf);
}

function impulse(ctx: AudioContext, seconds: number): AudioBuffer {
	const len = Math.floor(ctx.sampleRate * seconds);
	const buf = ctx.createBuffer(2, len, ctx.sampleRate);
	for (let ch = 0; ch < 2; ch++) {
		const d = buf.getChannelData(ch);
		for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
	}
	return buf;
}
