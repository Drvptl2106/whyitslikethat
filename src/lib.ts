import {Easing, interpolate, random, spring} from 'remotion';

export type Word = {w: string; s: number; e: number; k: boolean};
export type Scene = {id: string; start: number; end: number; words: Word[]; beats: Record<string, number>};
export type ReelProps = {
	id: string;
	title: string;
	handle: string;
	durationInFrames: number;
	audio: string;
	scenes: Scene[];
};

export const FPS = 30;

export const C = {
	bg: '#050912',
	green: '#25D366',
	bubble: '#005C4B',
	cyan: '#22D3EE',
	blue: '#53BDEB',
	purple: '#A78BFA',
	red: '#FF5A5F',
	amber: '#FBBF24',
	fg: '#F1F5F9',
	muted: '#7C8BA1',
	panel: '#0E1626',
	line: '#1E293B',
};

export const FONT = 'Inter';
export const MONO = 'JetBrains Mono';

// Timeline helpers: absolute seconds for scene starts/ends and named beats.
export const timeline = (scenes: Scene[]) => {
	const by = Object.fromEntries(scenes.map((s) => [s.id, s]));
	return {
		s: (id: string) => by[id].start,
		e: (id: string) => by[id].end,
		b: (id: string, beat: string) => by[id].start + by[id].beats[beat],
	};
};

export const sp = (frame: number, atSec: number, config: Record<string, number> = {}) =>
	spring({frame: frame - Math.round(atSec * FPS), fps: FPS, config: {damping: 13, mass: 0.7, stiffness: 120, ...config}});

export const ramp = (t: number, a: number, b: number, easing = Easing.inOut(Easing.cubic)) =>
	interpolate(t, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type Pt = {x: number; y: number};
export const quad = (p0: Pt, c: Pt, p1: Pt, t: number): Pt => ({
	x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * c.x + t ** 2 * p1.x,
	y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * c.y + t ** 2 * p1.y,
});

const GLYPHS = 'ABCDEF0123456789#$%&@*+=/\\<>{}';
// Reveal `text` left to right; unrevealed chars flicker as random glyphs.
export const scramble = (text: string, revealed: number, seed: string, frame: number) =>
	text
		.split('')
		.map((ch, i) => {
			if (ch === ' ') return ' ';
			if (i / text.length < revealed) return ch;
			const r = random(`${seed}-${i}-${Math.floor(frame / 2)}`);
			return GLYPHS[Math.floor(r * GLYPHS.length)];
		})
		.join('');

// Decaying screen shake triggered at the given times.
export const shake = (frame: number, times: number[], strength = 22) => {
	let x = 0;
	let y = 0;
	for (const t of times) {
		const f = frame - Math.round(t * FPS);
		if (f < 0 || f > 14) continue;
		const k = strength * (1 - f / 14);
		x += (random(`sx${t}-${f}`) - 0.5) * 2 * k;
		y += (random(`sy${t}-${f}`) - 0.5) * 2 * k;
	}
	return {x, y};
};
