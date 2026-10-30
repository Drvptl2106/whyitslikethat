import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {FPS} from '../lib';
import {K} from './kit';

export type Expr = 'neutral' | 'happy' | 'surprised' | 'skeptical' | 'thinking';

/**
 * The channel's mascot: a small monitor-headed bot with a screen face.
 * Mouth follows the voice envelope; eyes blink on their own, look around and change shape per expression.
 * Drawn at 300x340 and positioned by its centre.
 */
export const Mascot: React.FC<{
	x: number;
	y: number;
	scale: number;
	expr: Expr;
	mouth: number;
	look?: {x: number; y: number};
	wave?: boolean;
	point?: number | null; // right-arm angle in degrees (0 = straight right, -90 = up)
	squash?: number; // 0..1 landing squash
	opacity?: number;
}> = ({x, y, scale, expr, mouth, look = {x: 0, y: 0}, wave = false, point = null, squash = 0, opacity = 1}) => {
	const frame = useCurrentFrame();
	const t = frame / FPS;
	// blink roughly every 2.5-4.5s, 4 frames long
	let blink = 0;
	for (let k = 0; k < 40; k++) {
		const at = Math.round((k * 3.3 + random(`blink${k}`) * 1.8) * FPS);
		const d = frame - at;
		if (d >= 0 && d < 5) blink = Math.sin((d / 4) * Math.PI);
	}
	const bob = Math.sin(t * 2.2) * 6;
	const tilt = Math.sin(t * 1.3) * 2.5 + (expr === 'skeptical' ? -6 : 0) + (expr === 'thinking' ? 5 : 0);
	const antenna = Math.sin(t * 3.1) * 8 + mouth * 6;
	const lx = look.x * 10;
	const ly = look.y * 8;
	const sy = 1 - 0.12 * squash;
	const sx = 1 + 0.1 * squash;

	const eyeColor = '#EAFBFF';
	const eye = (cx: number, side: 'l' | 'r') => {
		if (expr === 'happy') {
			return <path d={`M${cx - 15} ${150} Q${cx} ${130} ${cx + 15} ${150}`} stroke={eyeColor} strokeWidth={8} strokeLinecap="round" fill="none" />;
		}
		const rx = expr === 'surprised' ? 17 : 13;
		let ry = expr === 'surprised' ? 19 : 19;
		if (expr === 'skeptical' && side === 'r') ry = 8;
		ry = Math.max(2, ry * (1 - blink));
		return <ellipse cx={cx + lx} cy={145 + ly} rx={rx} ry={ry} fill={eyeColor} />;
	};

	const armR = point !== null ? point : wave ? -110 + Math.sin(t * 10) * 22 : 35 + Math.sin(t * 2.2) * 4;
	const armL = -215 + Math.sin(t * 2.2 + 1) * 4;
	const arm = (ox: number, angle: number, len = 56) => (
		<g transform={`translate(${ox} 282) rotate(${angle})`}>
			<line x1={0} y1={0} x2={len} y2={0} stroke="#2E2E36" strokeWidth={16} strokeLinecap="round" />
			<circle cx={len + 4} cy={0} r={12} fill={K.accent} />
		</g>
	);

	return (
		<div
			style={{
				position: 'absolute',
				left: x - 150,
				top: y - 170,
				width: 300,
				height: 340,
				transform: `scale(${scale}) translateY(${bob}px)`,
				transformOrigin: '50% 100%',
				opacity,
			}}
		>
			<svg width={300} height={360} viewBox="0 0 300 360" style={{overflow: 'visible'}}>
				<defs>
					<linearGradient id="mhead" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#FFE07A" />
						<stop offset="1" stopColor="#F4B400" />
					</linearGradient>
					<radialGradient id="mscreen" cx="0.5" cy="0.4" r="0.7">
						<stop offset="0" stopColor="#1E2430" />
						<stop offset="1" stopColor="#0C0E12" />
					</radialGradient>
					<filter id="mglow" x="-50%" y="-50%" width="200%" height="200%">
						<feGaussianBlur stdDeviation="4" result="b" />
						<feMerge>
							<feMergeNode in="b" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>
				{/* shadow */}
				<ellipse cx={150} cy={338} rx={70 - bob} ry={10} fill="#000" opacity={0.45} />
				<g transform={`translate(150 330) scale(${sx} ${sy}) translate(-150 -330)`}>
					{arm(112, armL)}
					{point === null && arm(188, armR)}
					{/* body */}
					<rect x={106} y={250} width={88} height={64} rx={24} fill="#24242B" stroke="#33333C" strokeWidth={3} />
					<circle cx={150} cy={282} r={9} fill={K.accent} opacity={0.35 + 0.65 * mouth} filter="url(#mglow)" />
					<g transform={`rotate(${tilt} 150 250)`}>
						{/* antenna with "?" bulb */}
						<g transform={`rotate(${antenna} 150 70)`}>
							<line x1={150} y1={70} x2={150} y2={30} stroke="#2E2E36" strokeWidth={7} strokeLinecap="round" />
							<circle cx={150} cy={22} r={17} fill={expr === 'surprised' || expr === 'thinking' ? K.accent : '#3A3A44'} filter={expr === 'surprised' || expr === 'thinking' ? 'url(#mglow)' : undefined} />
							<text x={150} y={30} textAnchor="middle" fontFamily={K.font} fontWeight={900} fontSize={22} fill={expr === 'surprised' || expr === 'thinking' ? '#1A1400' : K.accent}>
								?
							</text>
						</g>
						{/* head */}
						<rect x={28} y={64} width={244} height={196} rx={52} fill="url(#mhead)" />
						<rect x={28} y={64} width={244} height={196} rx={52} fill="none" stroke="#00000022" strokeWidth={3} />
						<rect x={52} y={86} width={196} height={150} rx={36} fill="url(#mscreen)" />
						<rect x={60} y={92} width={110} height={20} rx={10} fill="#ffffff0d" />
						{/* face */}
						<g filter="url(#mglow)">
							{eye(112, 'l')}
							{eye(188, 'r')}
							{expr === 'skeptical' && <line x1={168} y1={118} x2={208} y2={126} stroke={eyeColor} strokeWidth={6} strokeLinecap="round" />}
							{mouth > 0.04 ? (
								<rect x={150 - 20 + lx * 0.5} y={196 + ly * 0.5 - mouth * 12} width={40} height={6 + mouth * 24} rx={10} fill={eyeColor} />
							) : expr === 'surprised' ? (
								<circle cx={150 + lx * 0.5} cy={200} r={8} fill="none" stroke={eyeColor} strokeWidth={5} />
							) : expr === 'skeptical' ? (
								<line x1={134} y1={202} x2={166} y2={196} stroke={eyeColor} strokeWidth={6} strokeLinecap="round" />
							) : (
								<path d={`M${132 + lx * 0.5} 194 Q${150 + lx * 0.5} 210 ${168 + lx * 0.5} 194`} stroke={eyeColor} strokeWidth={6} strokeLinecap="round" fill="none" />
							)}
						</g>
						<ellipse cx={78} cy={206} rx={12} ry={7} fill="#FF7AA2" opacity={0.45} />
						<ellipse cx={222} cy={206} rx={12} ry={7} fill="#FF7AA2" opacity={0.45} />
					</g>
					{point !== null && arm(196, point, 110)}
				</g>
			</svg>
		</div>
	);
};
