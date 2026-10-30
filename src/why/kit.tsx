import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {FPS} from '../lib';

export const K = {
	bg: '#09090B',
	fg: '#F5F5F4',
	muted: '#8A8A93',
	dim: '#3F3F46',
	panel: '#141417',
	line: '#26262B',
	accent: '#FFD23F',
	red: '#FF4D4D',
	blue: '#7DD3FC',
	green: '#4ADE80',
	font: 'Inter',
	mono: 'JetBrains Mono',
};

export type W = {w: string; s: number; e: number; k: boolean};
export type WhyScene = {id: string; start: number; end: number; words: W[]};
export type WhyProps = {id: string; handle: string; durationInFrames: number; audio: string; scenes: WhyScene[]};

const expo = Easing.bezier(0.16, 1, 0.3, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

export const useT = () => useCurrentFrame() / FPS;

/** 0→1 with expo-out, starting at `at` seconds. */
export const ein = (t: number, at: number, dur = 0.55) =>
	interpolate(t, [at, at + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: expo});
export const eio = (t: number, a: number, b: number) =>
	interpolate(t, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inOut});

/** Time a word (first match, punctuation ignored) is spoken within a scene. */
export const wordAt = (sc: WhyScene, word: string, nth = 0) => {
	const clean = (x: string) => x.replace(/[.,!?;:]+$/, '').toLowerCase();
	const hits = sc.words.filter((w) => clean(w.w) === clean(word));
	if (!hits[nth]) throw new Error(`word "${word}" not in scene ${sc.id}`);
	return hits[nth].s;
};

/** Element that rises + fades in at `at`. */
export const In: React.FC<{at: number; dy?: number; scale?: number; blur?: boolean; style?: React.CSSProperties; children: React.ReactNode}> = ({
	at,
	dy = 40,
	scale = 1,
	blur = true,
	style,
	children,
}) => {
	const t = useT();
	const p = ein(t, at);
	return (
		<div
			style={{
				opacity: p,
				transform: `translateY(${(1 - p) * dy}px) scale(${scale + (1 - scale) * p})`,
				filter: blur ? `blur(${(1 - p) * 10}px)` : undefined,
				...style,
			}}
		>
			{children}
		</div>
	);
};

/** Scene container: zoom-through transition in/out and a slow push-in while on screen. */
export const SceneFrame: React.FC<{sc: WhyScene; children: React.ReactNode}> = ({sc, children}) => {
	const t = useT();
	if (t < sc.start - 0.01 || t > sc.end + 0.01) return null;
	const enter = ein(t, sc.start, 0.45);
	const exit = eio(t, sc.end - 0.28, sc.end);
	const drift = 1 + 0.025 * ((t - sc.start) / Math.max(1, sc.end - sc.start));
	const scale = (0.94 + 0.06 * enter) * (1 + 0.08 * exit) * drift;
	return (
		<AbsoluteFill style={{opacity: enter * (1 - exit), transform: `scale(${scale})`, filter: `blur(${(1 - enter) * 12 + exit * 14}px)`}}>
			{children}
		</AbsoluteFill>
	);
};

export const Background: React.FC = () => {
	const frame = useCurrentFrame();
	const gx = 50 + 8 * Math.sin(frame / 90);
	const gy = 38 + 6 * Math.cos(frame / 110);
	return (
		<AbsoluteFill style={{background: K.bg}}>
			<AbsoluteFill style={{background: `radial-gradient(circle at ${gx}% ${gy}%, #FFD23F12, transparent 45%)`}} />
			<AbsoluteFill
				style={{
					backgroundImage: `radial-gradient(${K.line} 1.6px, transparent 1.6px)`,
					backgroundSize: '44px 44px',
					opacity: 0.55,
					maskImage: 'radial-gradient(ellipse at 50% 45%, black 25%, transparent 72%)',
				}}
			/>
			{/* film grain */}
			<AbsoluteFill style={{opacity: 0.07, mixBlendMode: 'overlay'}}>
				<svg width="100%" height="100%">
					<filter id="grain">
						<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={frame % 8} />
					</filter>
					<rect width="100%" height="100%" filter="url(#grain)" />
				</svg>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

/** Count from `from` to `to` between a and b seconds. */
export const count = (t: number, a: number, b: number, from: number, to: number) => from + (to - from) * eio(t, a, b);

export const fmt = (n: number, dp = 0) => n.toLocaleString('en-US', {minimumFractionDigits: dp, maximumFractionDigits: dp});

/** Captions: groups of up to 4 words; spoken words full white, keywords accent, upcoming dimmed. */
export const Captions: React.FC<{scenes: WhyScene[]}> = ({scenes}) => {
	const t = useT();
	const groups: W[][] = [];
	for (const sc of scenes) {
		let cur: W[] = [];
		for (const w of sc.words) {
			cur.push(w);
			if (cur.length >= 4 || /[.,?!:]$/.test(w.w)) {
				groups.push(cur);
				cur = [];
			}
		}
		if (cur.length) groups.push(cur);
	}
	const gi = groups.findIndex((g, i) => t >= g[0].s - 0.08 && (i === groups.length - 1 || t < groups[i + 1][0].s - 0.08));
	if (gi < 0) return null;
	const g = groups[gi];
	if (t > g[g.length - 1].e + 0.35) return null;
	const p = ein(t, g[0].s - 0.08, 0.25);
	return (
		<div style={{position: 'absolute', top: 1500, left: 70, right: 70, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0 18px', opacity: p, transform: `translateY(${(1 - p) * 14}px)`}}>
			{g.map((w, i) => {
				const on = t >= w.s - 0.02;
				return (
					<span
						key={i}
						style={{
							fontFamily: K.font,
							fontWeight: 800,
							fontSize: 60,
							letterSpacing: -0.5,
							color: on ? (w.k ? K.accent : K.fg) : '#ffffff40',
							textShadow: '0 4px 24px #000, 0 2px 0 #000',
						}}
					>
						{w.w}
					</span>
				);
			})}
		</div>
	);
};

export const Chip: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = K.accent}) => (
	<span
		style={{
			display: 'inline-block',
			fontFamily: K.font,
			fontWeight: 800,
			fontSize: 26,
			letterSpacing: 4,
			color,
			border: `2px solid ${color}55`,
			background: `${color}14`,
			padding: '8px 18px',
			borderRadius: 999,
		}}
	>
		{children}
	</span>
);

export const Panel: React.FC<{style?: React.CSSProperties; children: React.ReactNode; glow?: string}> = ({style, children, glow}) => (
	<div
		style={{
			background: `linear-gradient(180deg, #18181C, ${K.panel})`,
			border: `2px solid ${K.line}`,
			borderRadius: 32,
			boxShadow: `0 30px 80px #000c${glow ? `, 0 0 60px ${glow}33` : ''}`,
			...style,
		}}
	>
		{children}
	</div>
);

/** Stamp that slams down (scale from big, slight rotation) at `at`. */
export const Stamp: React.FC<{at: number; color: string; rotate?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, color, rotate = -8, children, style}) => {
	const t = useT();
	if (t < at) return null;
	const p = ein(t, at, 0.3);
	return (
		<div
			style={{
				display: 'inline-block',
				transform: `rotate(${rotate}deg) scale(${1.8 - 0.8 * p})`,
				opacity: Math.min(1, p * 2),
				border: `6px solid ${color}`,
				color,
				fontFamily: K.font,
				fontWeight: 900,
				fontSize: 44,
				letterSpacing: 3,
				padding: '8px 22px',
				borderRadius: 14,
				background: `${K.bg}d9`,
				...style,
			}}
		>
			{children}
		</div>
	);
};

/** Random-ish flicker for decorative digits. */
export const flick = (seed: string, frame: number, n: number) =>
	Array.from({length: n}, (_, i) => Math.floor(random(`${seed}${i}${Math.floor(frame / 2)}`) * 10)).join('');
