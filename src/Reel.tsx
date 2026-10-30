import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {C, FONT, FPS, lerp, Pt, quad, ramp, ReelProps, scramble, shake, sp, timeline, Word} from './lib';
import {Bubble, Key, Lock, Packet, Phone, Server, Ticks, Trail} from './parts';

const YOU: Pt = {x: 250, y: 1080};
const FRIEND: Pt = {x: 830, y: 1080};
const SERVER: Pt = {x: 540, y: 560};
const MSG = 'Hey, you free tonight?';

const TO_SERVER = {p0: {x: 250, y: 790}, c: {x: 190, y: 500}, p1: {x: 540, y: 560}};
const TO_FRIEND = {p0: {x: 540, y: 560}, c: {x: 890, y: 500}, p1: {x: 830, y: 790}};

type Cam = {x: number; y: number; z: number};
const FULL: Cam = {x: 540, y: 880, z: 0.95};

const path = (leg: {p0: Pt; c: Pt; p1: Pt}, t: number) => quad(leg.p0, leg.c, leg.p1, t);
const trail = (leg: {p0: Pt; c: Pt; p1: Pt}, t: number) =>
	Array.from({length: 10}, (_, i) => path(leg, Math.max(0, t - (10 - i) * 0.025)));

// ---------- background ----------
const Background: React.FC<{cam: Cam}> = ({cam}) => {
	const frame = useCurrentFrame();
	const ox = (-cam.x * 0.25 + frame * 0.6) % 90;
	const oy = (-cam.y * 0.25 + frame * 0.9) % 90;
	return (
		<AbsoluteFill style={{background: C.bg}}>
			<AbsoluteFill
				style={{
					backgroundImage: `linear-gradient(${C.line}55 2px, transparent 2px), linear-gradient(90deg, ${C.line}55 2px, transparent 2px)`,
					backgroundSize: '90px 90px',
					backgroundPosition: `${ox}px ${oy}px`,
					maskImage: 'radial-gradient(ellipse at 50% 45%, black 20%, transparent 75%)',
				}}
			/>
			{Array.from({length: 26}, (_, i) => {
				const x = (noise2D('px', i, frame * 0.004) * 0.5 + 0.5) * 1080;
				const y = ((i * 211 + frame * (0.6 + (i % 5) * 0.25)) % 2100) - 90;
				return <div key={i} style={{position: 'absolute', left: x, top: 1920 - y, width: 5, height: 5, borderRadius: 3, background: i % 3 ? C.cyan : C.green, opacity: 0.35}} />;
			})}
			<AbsoluteFill style={{background: `radial-gradient(circle at 50% 40%, ${C.green}14, transparent 55%)`}} />
		</AbsoluteFill>
	);
};

// ---------- captions: 3-word groups, active word pops ----------
const Captions: React.FC<{words: Word[]}> = ({words}) => {
	const frame = useCurrentFrame();
	const t = frame / FPS;
	const groups: Word[][] = [];
	let cur: Word[] = [];
	for (const w of words) {
		cur.push(w);
		if (cur.length >= 3 || /[.,?!]$/.test(w.w)) {
			groups.push(cur);
			cur = [];
		}
	}
	if (cur.length) groups.push(cur);
	const gi = groups.findIndex((g, i) => t >= g[0].s && (i === groups.length - 1 || t < groups[i + 1][0].s));
	if (gi < 0) return null;
	const g = groups[gi];
	if (t > g[g.length - 1].e + 0.6) return null;
	const gIn = sp(frame, g[0].s, {damping: 16, stiffness: 220});
	return (
		<div style={{position: 'absolute', top: 1470, width: 1080, display: 'flex', justifyContent: 'center', gap: 26, transform: `scale(${0.85 + 0.15 * gIn})`}}>
			{g.map((w, i) => {
				const active = t >= w.s;
				const pop = sp(frame, w.s, {damping: 10, stiffness: 260});
				const color = !active ? '#ffffff55' : w.k ? C.green : C.fg;
				return (
					<span
						key={i}
						style={{
							fontFamily: FONT,
							fontWeight: 900,
							fontSize: 74,
							color,
							textTransform: 'uppercase',
							letterSpacing: -1,
							transform: `translateY(${active ? -8 * (1 - pop) : 0}px) scale(${active ? 1 + 0.12 * (1 - pop) : 1})`,
							textShadow: '0 6px 0 #000, 0 0 30px #000',
							display: 'inline-block',
						}}
					>
						{w.w.replace(/[.,]$/, '')}
					</span>
				);
			})}
		</div>
	);
};

// ---------- screen-space cards ----------
const Card: React.FC<{show: number; top: number; children: React.ReactNode; border?: string}> = ({show, top, children, border = C.line}) =>
	show <= 0.001 ? null : (
		<div style={{position: 'absolute', top, width: 1080, display: 'flex', justifyContent: 'center', opacity: Math.min(1, show * 1.5)}}>
			<div
				style={{
					transform: `translateY(${(1 - show) * -40}px) scale(${0.7 + 0.3 * show})`,
					background: '#0B1322EE',
					border: `3px solid ${border}`,
					borderRadius: 28,
					padding: '22px 36px',
					display: 'flex',
					alignItems: 'center',
					gap: 22,
					fontFamily: FONT,
					fontWeight: 800,
					fontSize: 44,
					color: C.fg,
					boxShadow: `0 20px 60px #000a, 0 0 40px ${border}55`,
				}}
			>
				{children}
			</div>
		</div>
	);

export const Reel: React.FC<ReelProps> = ({scenes, audio, handle, durationInFrames}) => {
	const frame = useCurrentFrame();
	const t = frame / FPS;
	const T = timeline(scenes);
	const words = scenes.flatMap((s) => s.words);
	const between = (a: number, b: number) => t >= a && t < b;
	// show(a, b): springs in at a, out at b
	const show = (a: number, b: number) => sp(frame, a) * (1 - sp(frame, b, {damping: 20}));

	// ---- camera keyframes ----
	const keys: [number, Cam][] = [
		[T.b('hook', 'burst'), FULL],
		[T.s('encrypt'), {x: 250, y: 1000, z: 1.85}],
		[T.s('travel'), FULL],
		[T.s('server'), {x: 540, y: 600, z: 1.75}],
		[T.s('offline'), {x: 690, y: 820, z: 1.2}],
		[T.b('deliver', 'push'), FULL],
		[T.b('deliver', 'unlock') - 0.25, {x: 830, y: 1000, z: 1.85}],
		[T.s('read'), FULL],
		[T.b('read', 'blue') - 0.2, {x: 250, y: 1000, z: 1.85}],
		[T.s('outro'), {x: 540, y: 900, z: 0.82}],
	];
	let cam: Cam = {x: 250, y: 1020, z: 1.5};
	for (const [at, k] of keys) {
		const p = sp(frame, at, {damping: 22, stiffness: 90, mass: 0.9});
		cam = {x: lerp(cam.x, k.x, p), y: lerp(cam.y, k.y, p), z: lerp(cam.z, k.z, p)};
	}
	// slow drift so the frame never sits still
	cam = {...cam, z: cam.z * (1 + 0.015 * Math.sin(t * 0.8))};
	const shk = shake(frame, [T.b('hook', 'burst'), T.b('encrypt', 'lock'), T.b('server', 'nope'), T.b('outro', 'punch')]);

	// ---- message state on YOUR phone ----
	const sent = sp(frame, T.b('hook', 'tap'), {damping: 11, stiffness: 200});
	const scr = ramp(t, T.b('encrypt', 'scramble'), T.b('encrypt', 'scramble') + 0.7);
	const reUnscr = ramp(t, T.s('travel'), T.s('travel') + 0.5);
	const yourText = t < T.s('travel') ? scramble(MSG, 1 - scr, 'you', frame) : scramble(MSG, reUnscr, 'you2', frame);
	const yourTicks: 0 | 1 | 2 = t >= T.b('deliver', 'ticks') ? 2 : t >= T.b('server', 'tick') ? 1 : 0;
	const blue = t >= T.b('read', 'blue');
	const lockIn = between(T.b('encrypt', 'lock'), T.s('travel')) ? sp(frame, T.b('encrypt', 'lock'), {damping: 9, stiffness: 300}) : 0;
	const yourBubbles: Bubble[] =
		sent > 0.01
			? [{text: yourText, mine: true, ticks: yourTicks, blue, scale: sent, locked: lockIn ? 0.2 + lockIn * 0.8 : 0}]
			: [];

	// ---- FRIEND phone state ----
	const online = t >= T.b('deliver', 'on');
	const dim = online ? 1 - sp(frame, T.b('deliver', 'on')) : t >= T.s('travel') ? 1 : 0.6;
	const arrived = t >= T.b('deliver', 'push') + 0.8;
	const unl = sp(frame, T.b('deliver', 'unlock'), {damping: 12});
	const friendText = scramble(MSG, ramp(t, T.b('deliver', 'unlock'), T.b('deliver', 'unlock') + 0.7), 'fr', frame);
	const friendBubbles: Bubble[] = arrived
		? [{text: friendText, mine: false, scale: sp(frame, T.b('deliver', 'push') + 0.8, {damping: 11}), locked: 1 - ramp(t, T.b('deliver', 'unlock') + 0.5, T.b('deliver', 'unlock') + 0.9), lockOpen: unl}]
		: [];
	const offPill = show(T.b('offline', 'off'), T.b('deliver', 'on'));
	const onPill = show(T.b('deliver', 'on'), T.e('read'));

	// ---- packets ----
	const launch = T.b('travel', 'launch');
	const arrive = T.b('travel', 'arrive');
	const legA = ramp(t, launch, arrive, (x) => x);
	const push = T.b('deliver', 'push');
	const legB = ramp(t, push, push + 0.8, (x) => x);
	const fire = T.b('read', 'fire');
	const legR1 = ramp(t, fire, fire + 0.7, (x) => x);
	const legR2 = ramp(t, fire + 0.7, T.b('read', 'blue') - 0.1, (x) => x);
	const packetAt: Pt | null =
		between(launch, arrive) ? path(TO_SERVER, legA) : between(arrive, T.s('server')) || between(T.b('offline', 'hold'), push) ? {x: 540, y: 380} : between(push, push + 0.8) ? path(TO_FRIEND, legB) : null;
	const serverGlow = Math.max(
		1 - ramp(t, arrive, arrive + 0.6),
		between(arrive, push) ? 0.35 : 0,
		1 - ramp(t, fire + 0.7, fire + 1.2),
	);

	// connection lines
	const connA = sp(frame, launch);
	const connB = online ? sp(frame, T.b('deliver', 'on')) : 0;
	const pulse = 1 - ramp(t, T.b('travel', 'pulse'), T.b('travel', 'pulse') + 0.9);

	const reveal = sp(frame, T.b('hook', 'burst') - 0.1, {damping: 20});

	// route teaser during hook
	const teaser = show(T.b('hook', 'burst'), T.s('encrypt'));

	const step = (['encrypt', 'travel', 'server', 'offline', 'deliver', 'read'] as const).findIndex((id) => between(T.s(id), T.e(id)));
	const stepNames = ['ENCRYPTION', 'TO THE SERVER', 'ONE TICK', 'OFFLINE?', 'DELIVERED', 'READ'];

	return (
		<AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
			<Audio src={staticFile(audio)} />
			<AbsoluteFill style={{transform: `translate(${shk.x}px, ${shk.y}px)`}}>
				<Background cam={cam} />

				{/* ---------------- WORLD ---------------- */}
				<div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transformOrigin: '0 0', transform: `translate(${540 - cam.x * cam.z}px, ${960 - cam.y * cam.z}px) scale(${cam.z})`}}>
					<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
						{teaser > 0 && (
							<path
								d={`M250 790 Q190 500 540 560 Q890 500 830 790`}
								stroke={C.green}
								strokeWidth={6}
								fill="none"
								strokeDasharray="1400"
								strokeDashoffset={1400 * (1 - ramp(t, T.b('hook', 'burst'), T.b('hook', 'burst') + 1))}
								opacity={teaser}
								style={{filter: `drop-shadow(0 0 12px ${C.green})`}}
							/>
						)}
						<line x1={250} y1={790} x2={420} y2={720} stroke={C.cyan} strokeWidth={4 + 6 * pulse} strokeDasharray="14 12" strokeDashoffset={-frame * 2} opacity={connA * 0.7} />
						<line x1={660} y1={720} x2={830} y2={790} stroke={C.cyan} strokeWidth={4} strokeDasharray="14 12" strokeDashoffset={frame * 2} opacity={connB * 0.7} />
					</svg>
					<div style={{opacity: reveal}}>
						<Server at={SERVER} glow={serverGlow} />
					</div>
					<Phone at={YOU} name="Alex" label="YOU" bubbles={yourBubbles} tap={ramp(t, T.b('hook', 'tap') - 0.1, T.b('hook', 'tap') + 0.35)} />
					<div style={{opacity: reveal}}>
					<Phone
						at={FRIEND}
						name="Sam"
						label="FRIEND"
						bubbles={friendBubbles}
						dim={dim}
						tap={ramp(t, T.b('read', 'open') - 0.05, T.b('read', 'open') + 0.4)}
						status={
							<>
								{offPill > 0.01 && (
									<div style={{position: 'absolute', top: -70, width: 280, display: 'flex', justifyContent: 'center', transform: `scale(${offPill})`}}>
										<div style={{background: C.red, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 24, padding: '8px 20px', borderRadius: 999, letterSpacing: 3}}>OFFLINE</div>
									</div>
								)}
								{onPill > 0.01 && (
									<div style={{position: 'absolute', top: -70, width: 280, display: 'flex', justifyContent: 'center', transform: `scale(${onPill})`}}>
										<div style={{background: C.green, color: '#06210F', fontFamily: FONT, fontWeight: 900, fontSize: 24, padding: '8px 20px', borderRadius: 999, letterSpacing: 3}}>ONLINE</div>
									</div>
								)}
							</>
						}
					/>
					</div>

					{/* key reveal near your phone */}
					{between(T.b('encrypt', 'key'), T.s('travel') + 0.3) && (
						<div style={{position: 'absolute', left: 120, top: 1390, transform: `scale(${sp(frame, T.b('encrypt', 'key'))})`, display: 'flex', alignItems: 'center', gap: 10}}>
							<Key size={26} />
							<span style={{fontFamily: FONT, fontWeight: 800, fontSize: 20, color: C.amber}}>only Alex's phone can unlock</span>
						</div>
					)}

					{/* server: envelope with address + unreadable body */}
					{between(T.s('server'), T.s('offline') + 0.6) && (
						<div style={{position: 'absolute', left: 540, top: 380, transform: `translate(-50%,-50%) scale(${sp(frame, T.s('server'))})`}}>
							<div style={{background: '#0B1322', border: `3px solid ${C.cyan}`, borderRadius: 18, padding: '14px 20px', fontFamily: 'JetBrains Mono', fontSize: 20, color: C.fg, width: 300, boxShadow: `0 0 40px ${C.cyan}55`}}>
								<div style={{color: t >= T.b('server', 'label') ? C.green : C.muted, fontWeight: 700, transform: `scale(${1 + 0.15 * (1 - sp(frame, T.b('server', 'label'))) * (t >= T.b('server', 'label') ? 1 : 0)})`, transformOrigin: 'left'}}>
									TO: Alex
								</div>
								<div style={{color: C.cyan, marginTop: 6}}>{scramble('xxxxxxxxxxxxxxxxxxxx', 0, 'body', frame)}</div>
							</div>
							{t >= T.b('server', 'nope') && (
								<div
									style={{
										position: 'absolute',
										left: 30,
										top: 112,
										transform: `rotate(-10deg) scale(${2.4 - 1.4 * sp(frame, T.b('server', 'nope'), {damping: 14, stiffness: 300})})`,
										border: `5px solid ${C.red}`,
										color: C.red,
										fontFamily: FONT,
										fontWeight: 900,
										fontSize: 30,
										padding: '6px 14px',
										borderRadius: 10,
										background: '#1a0508dd',
										letterSpacing: 2,
										whiteSpace: 'nowrap',
									}}
								>
									CAN'T READ IT
								</div>
							)}
						</div>
					)}

					{/* hold ring while waiting on the server */}
					{between(T.b('offline', 'hold'), push) && (
						<svg width={200} height={200} style={{position: 'absolute', left: 440, top: 280}}>
							<circle cx={100} cy={100} r={80} stroke={C.amber} strokeWidth={6} fill="none" strokeDasharray={`${120} ${383}`} strokeDashoffset={-frame * 8} opacity={sp(frame, T.b('offline', 'hold'))} />
						</svg>
					)}

					{packetAt && (
						<>
							{between(launch, arrive) && <Trail points={trail(TO_SERVER, legA)} color={C.cyan} />}
							{between(push, push + 0.8) && <Trail points={trail(TO_FRIEND, legB)} color={C.cyan} />}
							<Packet at={packetAt} scale={0.9 + 0.2 * Math.sin(t * 10)} />
						</>
					)}
					{between(fire, T.b('read', 'blue') - 0.1) && (
						<>
							<Trail
								points={Array.from({length: 10}, (_, i) => {
									const k = Math.max(0, (t - (10 - i) * 0.02 - fire) / (T.b('read', 'blue') - 0.1 - fire));
									return k < 0.5 ? path({p0: TO_FRIEND.p1, c: TO_FRIEND.c, p1: TO_FRIEND.p0}, k * 2) : path({p0: TO_SERVER.p1, c: TO_SERVER.c, p1: TO_SERVER.p0}, (k - 0.5) * 2);
								})}
								color={C.blue}
							/>
							<Packet
								at={legR1 < 1 ? path({p0: TO_FRIEND.p1, c: TO_FRIEND.c, p1: TO_FRIEND.p0}, legR1) : path({p0: TO_SERVER.p1, c: TO_SERVER.c, p1: TO_SERVER.p0}, legR2)}
								color={C.blue}
								label="READ"
								scale={0.8}
							/>
						</>
					)}

					{/* blue tick burst */}
					{t >= T.b('read', 'blue') && t < T.b('read', 'blue') + 0.8 && (
						<div
							style={{
								position: 'absolute',
								left: 330 - 120 * ramp(t, T.b('read', 'blue'), T.b('read', 'blue') + 0.8),
								top: 940 - 120 * ramp(t, T.b('read', 'blue'), T.b('read', 'blue') + 0.8),
								width: 240 * ramp(t, T.b('read', 'blue'), T.b('read', 'blue') + 0.8),
								height: 240 * ramp(t, T.b('read', 'blue'), T.b('read', 'blue') + 0.8),
								borderRadius: '50%',
								border: `6px solid ${C.blue}`,
								opacity: 1 - ramp(t, T.b('read', 'blue'), T.b('read', 'blue') + 0.8),
							}}
						/>
					)}
				</div>

				{/* ---------------- SCREEN SPACE ---------------- */}
				{/* hook title */}
				{t < T.s('encrypt') + 0.5 &&
					(() => {
						const out = sp(frame, T.s('encrypt'), {damping: 20});
						const a = sp(frame, 0.0, {damping: 14});
						const b = sp(frame, 0.25, {damping: 9, stiffness: 180});
						return (
							<div style={{position: 'absolute', top: 210, width: 1080, textAlign: 'center', transform: `translateY(${-out * 300}px)`, opacity: 1 - out}}>
								<div style={{fontFamily: FONT, fontWeight: 900, fontSize: 62, color: C.fg, letterSpacing: -1, transform: `translateY(${(1 - a) * 40}px)`, opacity: a, textShadow: '0 4px 0 #000'}}>
									WHAT HAPPENS WHEN YOU HIT
								</div>
								<div
									style={{
										fontFamily: FONT,
										fontWeight: 900,
										fontSize: 190,
										lineHeight: 1,
										color: C.green,
										letterSpacing: -6,
										transform: `scale(${b})`,
										textShadow: `0 0 50px ${C.green}aa, 0 8px 0 #03381a`,
									}}
								>
									SEND?
								</div>
							</div>
						);
					})()}

				{/* hook: "< 1 second" badge on the teaser */}
				{teaser > 0.01 && (
					<Card show={teaser} top={1290} border={C.green}>
						<span style={{color: C.green}}>&lt; 1 second</span> <span style={{color: C.muted, fontSize: 36}}>· 3 stops</span>
					</Card>
				)}

				{/* step chip */}
				{step >= 0 && (
					<div style={{position: 'absolute', top: 200, width: 1080, display: 'flex', justifyContent: 'center'}}>
						<div
							key={step}
							style={{
								transform: `scale(${sp(frame, T.s(['encrypt', 'travel', 'server', 'offline', 'deliver', 'read'][step]), {damping: 12})})`,
								background: C.green,
								color: '#04210F',
								fontFamily: FONT,
								fontWeight: 900,
								fontSize: 34,
								letterSpacing: 3,
								padding: '12px 28px',
								borderRadius: 999,
								boxShadow: `0 0 40px ${C.green}88`,
							}}
						>
							STEP {step + 1}/6 · {stepNames[step]}
						</div>
					</div>
				)}

				{/* tick explainer cards */}
				<Card show={show(T.b('server', 'tick'), T.e('server'))} top={300} border="#9AA7B5">
					<Ticks n={1} color="#9AA7B5" size={44} /> <span>= reached the server</span>
				</Card>
				<Card show={show(T.b('deliver', 'ticks'), T.e('deliver'))} top={300} border="#9AA7B5">
					<Ticks n={2} color="#9AA7B5" size={44} /> <span>= on their phone</span>
				</Card>
				<Card show={show(T.b('read', 'blue'), T.e('read'))} top={300} border={C.blue}>
					<Ticks n={2} color={C.blue} size={44} /> <span>= they opened it</span>
				</Card>

				{/* offline: 30 day counter */}
				{(() => {
					const s = show(T.b('offline', 'days'), T.e('offline'));
					const n = Math.round(30 * ramp(t, T.b('offline', 'days'), T.b('offline', 'days') + 0.8));
					return (
						<Card show={s} top={300} border={C.amber}>
							<span style={{color: C.muted, fontSize: 36}}>held for up to</span>
							<span style={{color: C.amber, fontSize: 72, fontWeight: 900, fontVariantNumeric: 'tabular-nums'}}>{n} DAYS</span>
						</Card>
					);
				})()}

				{/* encrypt: lock badge */}
				<Card show={show(T.b('encrypt', 'lock'), T.e('encrypt'))} top={300} border={C.cyan}>
					<Lock size={40} /> <span>end-to-end encrypted</span>
				</Card>

				{/* outro */}
				{t >= T.s('outro') &&
					(() => {
						const a = sp(frame, T.s('outro'));
						const b = sp(frame, T.b('outro', 'punch'), {damping: 9, stiffness: 220});
						const c = sp(frame, T.b('outro', 'follow'));
						return (
							<>
								<AbsoluteFill style={{background: `${C.bg}cc`, opacity: a}} />
								<div style={{position: 'absolute', top: 470, width: 1080, textAlign: 'center', fontFamily: FONT, fontWeight: 900}}>
									<div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, transform: `scale(${a})`}}>
										<Ticks n={2} color={C.blue} size={110} />
										<span style={{fontSize: 80, color: C.fg}}>+ no reply</span>
									</div>
									<div style={{fontSize: 92, color: C.red, marginTop: 40, lineHeight: 1.05, transform: `scale(${b})`, opacity: b > 0.01 ? 1 : 0, textShadow: `0 0 40px ${C.red}88`}}>
										= NOT A TECH
										<br />
										PROBLEM.
									</div>
									<div style={{marginTop: 90, opacity: c, transform: `translateY(${(1 - c) * 40}px)`}}>
										<div style={{fontSize: 44, color: C.muted}}>follow for more tech,</div>
										<div style={{fontSize: 64, color: C.green}}>under the hood</div>
									</div>
								</div>
							</>
						);
					})()}

				{/* flash on the hook burst */}
				<AbsoluteFill style={{background: '#fff', opacity: 0.5 * (1 - ramp(t, T.b('hook', 'burst'), T.b('hook', 'burst') + 0.25)) * (t >= T.b('hook', 'burst') ? 1 : 0), pointerEvents: 'none'}} />

				<Captions words={words} />

				{/* chrome */}
				<div style={{position: 'absolute', top: 120, width: 1080, textAlign: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 30, color: C.muted, letterSpacing: 1}}>
					{handle}
				</div>
				<div style={{position: 'absolute', top: 0, left: 0, height: 8, width: interpolate(frame, [0, durationInFrames - 1], [0, 1080]), background: C.green, boxShadow: `0 0 20px ${C.green}`}} />
			</AbsoluteFill>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, #000a 100%)', pointerEvents: 'none'}} />
		</AbsoluteFill>
	);
};
