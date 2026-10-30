import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {C, FONT, MONO, Pt} from './lib';

export const Ticks: React.FC<{n: number; color: string; size?: number}> = ({n, color, size = 18}) => (
	<svg width={size * (n === 2 ? 1.45 : 1)} height={size} viewBox={`0 0 ${n === 2 ? 29 : 20} 20`}>
		<path d="M2 11 L7 16 L18 4" stroke={color} strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
		{n === 2 && <path d="M11 16 L12 16.5 L27 4" stroke={color} strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
	</svg>
);

export const Lock: React.FC<{size: number; open?: number; color?: string}> = ({size, open = 0, color = C.cyan}) => (
	<svg width={size} height={size * 1.25} viewBox="0 0 40 50">
		<path
			d="M11 22 V14 a9 9 0 0 1 18 0 V22"
			stroke={color}
			strokeWidth={5}
			fill="none"
			strokeLinecap="round"
			transform={`translate(${open * 9} ${-open * 7}) rotate(${open * 18} 29 22)`}
		/>
		<rect x={4} y={21} width={32} height={26} rx={6} fill={color} />
		<circle cx={20} cy={33} r={3.5} fill={C.bg} />
		<rect x={18.5} y={34} width={3} height={7} rx={1.5} fill={C.bg} />
	</svg>
);

export const Key: React.FC<{size: number; color?: string}> = ({size, color = C.amber}) => (
	<svg width={size * 2} height={size} viewBox="0 0 60 30">
		<circle cx={13} cy={15} r={10} stroke={color} strokeWidth={5} fill="none" />
		<path d="M23 15 H56 M46 15 V25 M54 15 V23" stroke={color} strokeWidth={5} strokeLinecap="round" />
	</svg>
);

export type Bubble = {text: string; mine: boolean; ticks?: 0 | 1 | 2; blue?: boolean; scale?: number; locked?: number; lockOpen?: number};

export const Phone: React.FC<{
	at: Pt;
	name: string;
	label: string;
	bubbles: Bubble[];
	dim?: number;
	glow?: string;
	status?: React.ReactNode;
	tap?: number; // 0..1 progress of a tap ripple near the send button / chat
}> = ({at, name, label, bubbles, dim = 0, glow = C.green, status, tap}) => {
	const W = 280;
	const H = 560;
	return (
		<div style={{position: 'absolute', left: at.x - W / 2, top: at.y - H / 2, width: W, height: H}}>
			<div
				style={{
					width: W,
					height: H,
					borderRadius: 46,
					background: '#0A111E',
					border: '7px solid #26324A',
					boxShadow: `0 0 ${70 * (1 - dim)}px ${glow}44, inset 0 0 0 2px #0006`,
					overflow: 'hidden',
					position: 'relative',
					filter: `grayscale(${dim}) brightness(${1 - dim * 0.55})`,
				}}
			>
				<div style={{position: 'absolute', top: 10, left: W / 2 - 50, width: 86, height: 22, borderRadius: 12, background: '#000'}} />
				<div style={{height: 92, background: '#111B2B', display: 'flex', alignItems: 'flex-end', padding: '0 18px 14px', gap: 12}}>
					<div style={{width: 40, height: 40, borderRadius: 20, background: `linear-gradient(135deg, ${C.purple}, ${C.cyan})`}} />
					<div style={{fontFamily: FONT, fontWeight: 700, fontSize: 20, color: C.fg}}>{name}</div>
				</div>
				<div style={{padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 10}}>
					{bubbles.map((b, i) => (
						<div
							key={i}
							style={{
								alignSelf: b.mine ? 'flex-end' : 'flex-start',
								maxWidth: 210,
								background: b.mine ? C.bubble : '#1F2C34',
								borderRadius: 14,
								padding: '9px 12px 7px',
								color: C.fg,
								fontFamily: b.locked ? MONO : FONT,
								fontWeight: 600,
								fontSize: 17,
								lineHeight: 1.3,
								transform: `scale(${b.scale ?? 1})`,
								transformOrigin: b.mine ? 'right bottom' : 'left bottom',
								position: 'relative',
								wordBreak: 'break-all',
							}}
						>
							{b.text}
							{b.mine && (
								<div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 3, height: 16}}>
									{b.ticks ? <Ticks n={b.ticks} color={b.blue ? C.blue : '#9AA7B5'} size={15} /> : <span style={{fontSize: 11, color: '#9AA7B5'}}>◷</span>}
								</div>
							)}
							{b.locked ? (
								<div
									style={{
										position: 'absolute',
										right: -16,
										top: -24,
										transform: `scale(${b.locked})`,
										filter: `drop-shadow(0 0 12px ${C.cyan})`,
									}}
								>
									<Lock size={34} open={b.lockOpen ?? 0} />
								</div>
							) : null}
						</div>
					))}
				</div>
				<div
					style={{
						position: 'absolute',
						bottom: 16,
						left: 14,
						right: 14,
						height: 46,
						borderRadius: 23,
						background: '#1A2433',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'flex-end',
						paddingRight: 4,
					}}
				>
					<div style={{width: 38, height: 38, borderRadius: 19, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
						<svg width={18} height={18} viewBox="0 0 24 24">
							<path d="M3 20 L21 12 L3 4 L5 12 Z" fill="#06210F" />
						</svg>
					</div>
				</div>
				{tap !== undefined && tap > 0 && tap < 1 && (
					<div
						style={{
							position: 'absolute',
							right: 18 + 19 - 40 * tap,
							bottom: 16 + 23 - 40 * tap,
							width: 80 * tap,
							height: 80 * tap,
							borderRadius: '50%',
							border: `4px solid ${C.fg}`,
							opacity: 1 - tap,
						}}
					/>
				)}
			</div>
			<div
				style={{
					position: 'absolute',
					top: H + 18,
					width: W,
					textAlign: 'center',
					fontFamily: FONT,
					fontWeight: 800,
					fontSize: 26,
					letterSpacing: 4,
					color: C.muted,
				}}
			>
				{label}
			</div>
			{status}
		</div>
	);
};

export const Server: React.FC<{at: Pt; glow: number}> = ({at, glow}) => {
	const frame = useCurrentFrame();
	const W = 300;
	return (
		<div style={{position: 'absolute', left: at.x - W / 2, top: at.y - 150, width: W}}>
			{[0, 1, 2].map((u) => (
				<div
					key={u}
					style={{
						height: 86,
						marginBottom: 10,
						borderRadius: 14,
						background: 'linear-gradient(180deg,#152036,#0D1524)',
						border: `3px solid ${glow > 0.05 ? C.cyan : '#26324A'}`,
						boxShadow: `0 0 ${60 * glow}px ${C.cyan}`,
						display: 'flex',
						alignItems: 'center',
						padding: '0 20px',
						gap: 12,
					}}
				>
					{[0, 1, 2, 3].map((l) => {
						const on = random(`led-${u}-${l}-${Math.floor(frame / 4)}`) > 0.4;
						return <div key={l} style={{width: 12, height: 12, borderRadius: 6, background: on ? C.green : '#1C3326', boxShadow: on ? `0 0 10px ${C.green}` : 'none'}} />;
					})}
					<div style={{flex: 1}} />
					{[0, 1, 2, 3, 4].map((l) => (
						<div key={l} style={{width: 6, height: 40, borderRadius: 3, background: '#24314A'}} />
					))}
				</div>
			))}
			<div style={{textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 24, letterSpacing: 4, color: C.muted, marginTop: 8}}>
				WHATSAPP SERVER
			</div>
		</div>
	);
};

// Encrypted packet: lock + scrambled hex.
export const Packet: React.FC<{at: Pt; scale?: number; color?: string; label?: string}> = ({at, scale = 1, color = C.cyan, label}) => {
	const frame = useCurrentFrame();
	const hex = Array.from({length: 6}, (_, i) => '0123456789abcdef'[Math.floor(random(`p${i}-${Math.floor(frame / 3)}`) * 16)]).join('');
	return (
		<div
			style={{
				position: 'absolute',
				left: at.x,
				top: at.y,
				transform: `translate(-50%,-50%) scale(${scale})`,
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				padding: '10px 18px',
				borderRadius: 999,
				background: '#071A22',
				border: `3px solid ${color}`,
				boxShadow: `0 0 40px ${color}, 0 0 90px ${color}66`,
				fontFamily: MONO,
				fontWeight: 700,
				fontSize: 22,
				color,
				whiteSpace: 'nowrap',
			}}
		>
			{label ? (
				<>
					<Ticks n={2} color={color} size={20} /> {label}
				</>
			) : (
				<>
					<Lock size={22} color={color} /> {hex}
				</>
			)}
		</div>
	);
};

// Glowing trail of fading dots behind a moving point.
export const Trail: React.FC<{points: Pt[]; color: string}> = ({points, color}) => (
	<>
		{points.map((p, i) => {
			const k = (i + 1) / points.length;
			return (
				<div
					key={i}
					style={{
						position: 'absolute',
						left: p.x - 9 * k,
						top: p.y - 9 * k,
						width: 18 * k,
						height: 18 * k,
						borderRadius: '50%',
						background: color,
						opacity: 0.5 * k,
						boxShadow: `0 0 20px ${color}`,
					}}
				/>
			);
		})}
	</>
);
