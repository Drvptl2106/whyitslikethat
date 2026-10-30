import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Background, Captions, Chip, count, ein, eio, fmt, In, K, Panel, SceneFrame, Stamp, useT, WhyProps, WhyScene, wordAt} from './kit';
import {Expr, Mascot} from './Mascot';

const Stack: React.FC<{gap?: number; children: React.ReactNode}> = ({gap = 40, children}) => (
	<div style={{position: 'absolute', top: 220, height: 1010, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap}}>{children}</div>
);

const center: React.CSSProperties = {position: 'absolute', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'};
const h1 = (size = 104, color = K.fg): React.CSSProperties => ({fontFamily: K.font, fontWeight: 900, fontSize: size, color, letterSpacing: -3, lineHeight: 1.02, textAlign: 'center'});
const mono = (size: number, color = K.fg): React.CSSProperties => ({fontFamily: K.mono, fontWeight: 700, fontSize: size, color, fontVariantNumeric: 'tabular-nums'});

// ---------- 1. hook: POV, your new laptop ----------
const Cursor: React.FC<{x: number; y: number; click: number}> = ({x, y, click}) => (
	<div style={{position: 'absolute', left: x, top: y}}>
		{click > 0 && click < 1 && (
			<div style={{position: 'absolute', left: -40 * click, top: -40 * click, width: 80 * click, height: 80 * click, borderRadius: '50%', border: `4px solid ${K.fg}`, opacity: 1 - click}} />
		)}
		<svg width={44} height={56} viewBox="0 0 22 28" style={{filter: 'drop-shadow(0 4px 8px #000a)'}}>
			<path d="M1 1 L1 22 L7 17 L11 26 L15 24 L11 15 L19 15 Z" fill="#fff" stroke="#000" strokeWidth={1.5} strokeLinejoin="round" />
		</svg>
	</div>
);

const Laptop: React.FC<{sc: WhyScene}> = ({sc}) => {
	const t = useT();
	const tOpen = wordAt(sc, 'open');
	const tSays = wordAt(sc, 'says');
	const t931 = wordAt(sc, '931');
	const tTB = wordAt(sc, '1');
	const W = 900;
	const H = 560;
	const folder = {x: 96, y: 92};
	const move = eio(t, sc.start + 0.8, tOpen - 0.05);
	const cx = 760 + (folder.x + 40 - 760) * move;
	const cy = 470 + (folder.y + 40 - 470) * move;
	const win = ein(t, tOpen + 0.05, 0.5);
	const shown = count(t, tSays, t931 + 0.15, 0, 931);
	const sticker = ein(t, tTB - 0.05, 0.35);
	return (
		<div style={{position: 'relative', width: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
			<div style={{width: W + 36, height: H + 36, borderRadius: 34, background: '#1B1B20', border: '2px solid #2C2C33', padding: 18, boxShadow: '0 40px 100px #000'}}>
				<div style={{width: W, height: H, borderRadius: 18, overflow: 'hidden', position: 'relative', background: 'radial-gradient(circle at 30% 20%, #23324A, #0E1420 70%)'}}>
					{/* desktop folder */}
					<div style={{position: 'absolute', left: folder.x, top: folder.y, width: 96, textAlign: 'center'}}>
						<svg width={96} height={76} viewBox="0 0 48 38">
							<path d="M2 6 a3 3 0 0 1 3-3 h12 l4 4 h22 a3 3 0 0 1 3 3 v24 a3 3 0 0 1-3 3 H5 a3 3 0 0 1-3-3 Z" fill="#F7C548" />
							<rect x={2} y={11} width={44} height={24} rx={3} fill="#FFD866" />
						</svg>
						<div style={{fontFamily: K.font, fontWeight: 600, fontSize: 22, color: K.fg}}>Files</div>
					</div>
					{/* files window */}
					{win > 0 && (
						<div
							style={{
								position: 'absolute',
								left: 70,
								top: 60,
								width: 760,
								height: 440,
								borderRadius: 16,
								background: '#1A1C22',
								border: '1px solid #33363F',
								boxShadow: '0 30px 60px #0009',
								transformOrigin: `${folder.x + 48 - 70}px ${folder.y + 38 - 60}px`,
								transform: `scale(${0.1 + 0.9 * win})`,
								opacity: win,
								overflow: 'hidden',
							}}
						>
							<div style={{height: 48, background: '#22252D', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 8}}>
								{['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
									<div key={c} style={{width: 13, height: 13, borderRadius: 7, background: c}} />
								))}
								<span style={{marginLeft: 14, fontFamily: K.font, fontWeight: 700, fontSize: 20, color: K.muted}}>Files › This device</span>
							</div>
							<div style={{display: 'flex', height: 392}}>
								<div style={{width: 180, borderRight: '1px solid #2A2D35', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 18}}>
									{['Home', 'Desktop', 'Downloads', 'This device'].map((n, i) => (
										<div key={n} style={{fontFamily: K.font, fontWeight: 600, fontSize: 20, color: i === 3 ? K.fg : K.muted}}>
											{n}
										</div>
									))}
								</div>
								<div style={{flex: 1, padding: '34px 34px'}}>
									<div style={{fontFamily: K.font, fontWeight: 700, fontSize: 20, color: K.muted, letterSpacing: 2}}>DEVICES AND DRIVES</div>
									<div style={{marginTop: 22, padding: '24px 26px', borderRadius: 16, background: '#23262E', border: `2px solid ${t >= t931 ? K.red : '#30343D'}`}}>
										<div style={{display: 'flex', alignItems: 'center', gap: 18}}>
											<div style={{width: 64, height: 46, borderRadius: 8, background: 'linear-gradient(180deg,#9AA3B2,#5F6776)'}} />
											<div style={{fontFamily: K.font, fontWeight: 800, fontSize: 30, color: K.fg}}>Local Disk (C:)</div>
										</div>
										<div style={{marginTop: 20, height: 22, borderRadius: 11, background: '#30343D', overflow: 'hidden'}}>
											<div style={{height: '100%', width: `${(shown / 1000) * 100}%`, background: `linear-gradient(90deg, ${K.blue}, #A5E4FF)`}} />
										</div>
										<div style={{marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
											<span style={{fontFamily: K.font, fontWeight: 600, fontSize: 22, color: K.muted}}>total size</span>
											<span style={{...mono(56, t >= t931 ? K.red : K.fg)}}>{fmt(Math.round(shown))} GB</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}
					<Cursor x={cx} y={cy} click={eio(t, tOpen - 0.05, tOpen + 0.35)} />
				</div>
			</div>
			<div style={{width: 1000, height: 30, marginTop: -2, borderRadius: '0 0 30px 30px', background: 'linear-gradient(180deg,#2C2C33,#16161A)'}} />
			{/* "1 TB" sticker slapped on */}
			<div
				style={{
					position: 'absolute',
					right: -6,
					top: -34,
					opacity: sticker,
					transform: `rotate(${10 - 2 * sticker}deg) scale(${1.6 - 0.6 * sticker})`,
					background: K.accent,
					color: '#1A1400',
					fontFamily: K.font,
					fontWeight: 900,
					fontSize: 44,
					padding: '12px 24px',
					borderRadius: 16,
					boxShadow: '0 16px 40px #000a',
				}}
			>
				1 TB SSD
			</div>
		</div>
	);
};

const Hook: React.FC<{sc: WhyScene}> = ({sc}) => {
	const t = useT();
	const tWait = wordAt(sc, 'wait');
	const tScam = wordAt(sc, 'scam');
	return (
		<SceneFrame sc={sc}>
			<Stack gap={70}>
				<In at={sc.start} scale={0.9} dy={60}>
					<div style={{position: 'relative'}}>
						<Laptop sc={sc} />
						<div style={{position: 'absolute', left: 0, right: 0, top: 230, display: 'flex', justifyContent: 'center'}}>
							<Stamp at={tScam} color={K.red} rotate={-9} style={{fontSize: 92, padding: '10px 34px', borderWidth: 10}}>
								SCAMMED?
							</Stamp>
						</div>
					</div>
				</In>
				<In at={tWait - 0.08} dy={30}>
					<div style={{position: 'relative'}}>
						<div style={{background: K.fg, color: '#111', borderRadius: 40, padding: '24px 40px', fontFamily: K.font, fontWeight: 800, fontSize: 50}}>
							wait… I paid for <span style={{color: '#C81E1E'}}>1 TB</span>??
						</div>
						<div style={{position: 'absolute', left: 70, bottom: -26, width: 30, height: 30, borderRadius: 15, background: K.fg}} />
						<div style={{position: 'absolute', left: 48, bottom: -52, width: 16, height: 16, borderRadius: 8, background: K.fg}} />
					</div>
				</In>
			</Stack>
		</SceneFrame>
	);
};

// ---------- 1b. reveal: the mascot arrives ----------
const Reveal: React.FC<{sc: WhyScene}> = ({sc}) => (
	<SceneFrame sc={sc}>
		<div style={{...center, top: 280}}>
			<In at={wordAt(sc, 'nope') - 0.05} dy={30}>
				<div style={h1(120, K.accent)}>nope.</div>
			</In>
			<In at={wordAt(sc, 'reason') - 0.15} dy={30} style={{marginTop: 18}}>
				<div style={h1(76)}>
					there’s a <span style={{color: K.accent}}>reason</span>
					<br />
					for that.
				</div>
			</In>
		</div>
	</SceneFrame>
);

// ---------- 2. two languages ----------
const UnitCard: React.FC<{at: number; who: string; color: string; bytes: string}> = ({at, who, color, bytes}) => {
	const t = useT();
	const typed = Math.round(bytes.length * eio(t, at + 0.15, at + 0.8));
	return (
		<In at={at}>
			<Panel style={{width: 880, padding: '36px 44px'}} glow={color}>
				<Chip color={color}>{who}</Chip>
				<div style={{marginTop: 22, display: 'flex', alignItems: 'baseline', gap: 22}}>
					<span style={{...h1(72), textAlign: 'left'}}>1 GB =</span>
					<span style={mono(56, color)}>{bytes.slice(0, typed)}</span>
				</div>
				<div style={{fontFamily: K.font, fontWeight: 600, fontSize: 30, color: K.muted, marginTop: 6}}>bytes</div>
			</Panel>
		</In>
	);
};

const Langs: React.FC<{sc: WhyScene}> = ({sc}) => {
	const t = useT();
	const tL = wordAt(sc, 'languages');
	return (
		<SceneFrame sc={sc}>
			<Stack gap={34}>
				<In at={sc.start + 0.05} style={{marginBottom: 30}}>
					<div style={h1(100)}>
						two different
						<br />
						<span style={{color: K.accent}}>languages.</span>
					</div>
				</In>
				<UnitCard at={wordAt(sc, 'drive') - 0.1} who="YOUR DRIVE" color={K.accent} bytes="1,000,000,000" />
				<div style={{...h1(80, K.red), opacity: ein(t, tL), transform: `scale(${0.6 + 0.4 * ein(t, tL)})`, height: 70, marginTop: -10}}>≠</div>
				<UnitCard at={wordAt(sc, 'computer') - 0.1} who="YOUR COMPUTER" color={K.blue} bytes="1,073,741,824" />
			</Stack>
		</SceneFrame>
	);
};

// ---------- 3. powers of two ----------
const Binary: React.FC<{sc: WhyScene}> = ({sc}) => {
	const t = useT();
	const tPow = wordAt(sc, 'powers');
	const t1024 = wordAt(sc, '1,024');
	const tKB = wordAt(sc, 'kilobyte');
	const tClose = wordAt(sc, 'close');
	const vals = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
	return (
		<SceneFrame sc={sc}>
			<Stack gap={48}>
				<In at={sc.start + 0.05}>
					<Chip>COMPUTERS COUNT IN POWERS OF 2</Chip>
				</In>
			<div style={{width: 920, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center'}}>
				{vals.map((v, i) => {
					const at = tPow + ((t1024 - tPow) * i) / (vals.length - 1);
					const p = ein(t, at, 0.35);
					const last = i === vals.length - 1;
					return (
						<div
							key={v}
							style={{
								opacity: 0.15 + 0.85 * p,
								transform: `scale(${0.85 + 0.15 * p})`,
								padding: last ? '18px 34px' : '14px 22px',
								borderRadius: 18,
								border: `2px solid ${last && p > 0.5 ? K.accent : K.line}`,
								background: last && p > 0.5 ? `${K.accent}22` : K.panel,
								...mono(last ? 64 : 40, last && p > 0.5 ? K.accent : K.fg),
							}}
						>
							{fmt(v)}
						</div>
					);
				})}
			</div>
			<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
				<In at={t1024 - 0.05}>
					<div style={{...h1(150), display: 'flex', alignItems: 'baseline', gap: 10}}>
						<span>
							2<sup style={{fontSize: 76}}>10</sup>
						</span>
						<span style={{color: K.muted}}>=</span>
						<span style={{color: K.accent}}>1,024</span>
					</div>
				</In>
				<In at={tKB - 0.05} style={{marginTop: 26}}>
					<div style={h1(64, K.fg)}>
						“that’s a <span style={{color: K.accent}}>kilobyte</span>”
					</div>
				</In>
			</div>
				<In at={tClose - 0.1}>
						<div style={{width: 860}}>
							{[
								['1,000', 1000, K.muted],
								['1,024', 1024, K.accent],
							].map(([label, v, c]) => (
								<div key={label as string} style={{display: 'flex', alignItems: 'center', gap: 20, marginBottom: 14}}>
									<span style={{...mono(34, c as string), width: 130}}>{label}</span>
									<div style={{height: 26, borderRadius: 13, background: c as string, width: `${(((v as number) / 1024) * 690 * ein(t, tClose, 0.8)).toFixed(1)}px`}} />
								</div>
							))}
							<div style={{fontFamily: K.font, fontWeight: 700, fontSize: 34, color: K.muted, textAlign: 'center', marginTop: 6}}>close enough… right?</div>
						</div>
				</In>
			</Stack>
		</SceneFrame>
	);
};

// ---------- 4. the gap grows ----------
const Gap: React.FC<{sc: WhyScene}> = ({sc}) => {
	const t = useT();
	const rows = [
		{unit: 'KILOBYTE', at: wordAt(sc, '2%'), pct: 2.4, ratio: 1.024},
		{unit: 'GIGABYTE', at: wordAt(sc, '7%'), pct: 7.4, ratio: 1.0737},
		{unit: 'TERABYTE', at: wordAt(sc, '10%'), pct: 10, ratio: 1.0995},
	];
	return (
		<SceneFrame sc={sc}>
			<Stack gap={38}>
				<In at={sc.start + 0.05} style={{marginBottom: 20}}>
					<div style={h1(110)}>
						the gap
						<br />
						<span style={{color: K.red}}>grows.</span>
					</div>
				</In>
				{rows.map((r) => {
					const p = ein(t, r.at - 0.1, 0.9);
					return (
						<In key={r.unit} at={r.at - 0.15}>
							<Panel style={{width: 880, padding: '28px 36px'}}>
								<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
									<span style={{fontFamily: K.font, fontWeight: 800, fontSize: 30, letterSpacing: 4, color: K.muted}}>{r.unit}</span>
									<span style={mono(64, r.pct >= 10 ? K.red : K.accent)}>
										{r.pct >= 10 ? '~' : ''}
										{count(t, r.at - 0.1, r.at + 0.6, 0, r.pct).toFixed(r.pct >= 10 ? 0 : 1)}%
									</span>
								</div>
								<div style={{marginTop: 16, position: 'relative', height: 22}}>
									<div style={{position: 'absolute', left: 0, top: 0, height: 22, width: 720, borderRadius: 11, background: '#2A2A31'}} />
									<div style={{position: 'absolute', left: 0, top: 0, height: 22, width: 720 * p, borderRadius: 11, background: K.muted}} />
									<div
										style={{
											position: 'absolute',
											left: 720,
											top: 0,
											height: 22,
											width: 720 * (r.ratio - 1) * 1.6 * p,
											borderRadius: '0 11px 11px 0',
											background: r.pct >= 10 ? K.red : K.accent,
										}}
									/>
								</div>
							</Panel>
						</In>
					);
				})}
			</Stack>
		</SceneFrame>
	);
};

// ---------- 5. the math ----------
const MathScene: React.FC<{sc: WhyScene}> = ({sc}) => {
	const t = useT();
	const tTr = wordAt(sc, 'trillion');
	const tDiv = wordAt(sc, 'divides');
	const tThree = wordAt(sc, 'three');
	const t931 = wordAt(sc, '931');
	const tGB = wordAt(sc, 'gigabytes');
	const steps = [
		{at: tDiv + 0.2, v: '976,562,500'},
		{at: tThree, v: '953,674.3'},
		{at: tThree + 0.45, v: '931.32'},
	];
	return (
		<SceneFrame sc={sc}>
			<Stack gap={50}>
				<In at={sc.start + 0.05}>
					<Chip>DRIVE MAKERS: METRIC, LIKE KILOMETRES</Chip>
				</In>
				<In at={tTr - 0.3}>
					<Panel style={{width: 900, padding: '40px 48px'}} glow={K.accent}>
						<div style={{fontFamily: K.font, fontWeight: 700, fontSize: 30, color: K.muted}}>1 terabyte</div>
						<div style={mono(66, K.accent)}>1,000,000,000,000</div>
						<div style={{fontFamily: K.font, fontWeight: 700, fontSize: 30, color: K.muted}}>bytes</div>
						<div style={{height: 2, background: K.line, margin: '28px 0'}} />
						{steps.map((s, i) => {
							const p = ein(t, s.at, 0.4);
							const final = i === steps.length - 1;
							return (
								<div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', opacity: p, transform: `translateX(${(1 - p) * -30}px)`, marginBottom: 10}}>
									<span style={mono(40, K.blue)}>÷ 1,024</span>
									<span style={mono(final ? 74 : 44, final && t >= t931 ? K.accent : K.fg)}>{s.v}</span>
								</div>
							);
						})}
					</Panel>
				</In>
					<In at={tGB - 0.1}>
						<div style={{...h1(74), display: 'flex', alignItems: 'center', gap: 26}}>
							<span>…and calls it</span>
							<span style={{color: K.red, position: 'relative'}}>
								“GB”
								<div style={{position: 'absolute', left: -6, right: -6, top: '52%', height: 8, borderRadius: 4, background: K.red, transform: `scaleX(${ein(t, tGB + 0.3, 0.4)})`, transformOrigin: 'left'}} />
							</span>
						</div>
					</In>
			</Stack>
		</SceneFrame>
	);
};

// ---------- 6. court ----------
const Case: React.FC<{at: number; year: string; who: string; line: string; stampAt: number; stamp: string}> = ({at, year, who, line, stampAt, stamp}) => (
	<In at={at} dy={60}>
		<Panel style={{width: 880, padding: '34px 42px', position: 'relative'}}>
			<div style={{display: 'flex', alignItems: 'baseline', gap: 20}}>
				<span style={mono(54, K.accent)}>{year}</span>
				<span style={{fontFamily: K.font, fontWeight: 900, fontSize: 44, color: K.fg}}>{who}</span>
			</div>
			<div style={{fontFamily: K.font, fontWeight: 600, fontSize: 34, color: K.muted, marginTop: 10, lineHeight: 1.3}}>{line}</div>
			<div style={{position: 'absolute', right: 30, top: -30}}>
				<Stamp at={stampAt} color={K.red}>
					{stamp}
				</Stamp>
			</div>
		</Panel>
	</In>
);

const Court: React.FC<{sc: WhyScene}> = ({sc}) => (
	<SceneFrame sc={sc}>
		<Stack gap={60}>
			<In at={sc.start + 0.05}>
				<div style={h1(104)}>
					it went to
					<br />
					<span style={{color: K.red}}>court.</span>
				</div>
			</In>
			<Case at={wordAt(sc, 'Western') - 0.1} year="2006" who="Western Digital" line="sued: an “80 GB” drive showed 74.4 GB" stampAt={wordAt(sc, 'settled')} stamp="SETTLED" />
			<Case at={wordAt(sc, 'Seagate') - 0.1} year="2007" who="Seagate" line="settled: 5% refund or free backup software" stampAt={wordAt(sc, 'refunds')} stamp="REFUNDS" />
		</Stack>
	</SceneFrame>
);

// ---------- 7. gibibyte + mac ----------
const Screen: React.FC<{os: string; value: string; color: string; at: number}> = ({os, value, color, at}) => {
	const t = useT();
	return (
		<In at={at}>
			<Panel style={{width: 410, padding: '30px 30px 36px'}} glow={color}>
				<div style={{display: 'flex', gap: 8, marginBottom: 22}}>
					{['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
						<div key={c} style={{width: 14, height: 14, borderRadius: 7, background: c, opacity: 0.8}} />
					))}
				</div>
				<div style={{fontFamily: K.font, fontWeight: 800, fontSize: 30, letterSpacing: 3, color: K.muted}}>{os}</div>
				<div style={{...mono(78, color), marginTop: 8}}>{value}</div>
				<div style={{height: 14, borderRadius: 7, background: color, marginTop: 14, opacity: 0.85, width: `${100 * ein(t, at + 0.1, 0.8)}%`}} />
			</Panel>
		</In>
	);
};

const Fix: React.FC<{sc: WhyScene}> = ({sc}) => {
	const t = useT();
	const tG = wordAt(sc, 'gibibyte');
	const tNobody = wordAt(sc, 'nobody');
	const tApple = wordAt(sc, 'since');
	const dictOut = eio(t, tApple - 0.3, tApple);
	return (
		<SceneFrame sc={sc}>
			{t < tApple + 0.05 && (
				<div style={{position: 'absolute', top: 220, height: 1010, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 1 - dictOut, transform: `translateY(${-dictOut * 60}px)`}}>
					<In at={tG - 0.25}>
						<Panel style={{width: 880, padding: '44px 48px', position: 'relative'}}>
							<div style={{fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 40, color: K.muted}}>1998 · a new word</div>
							<div style={{...h1(110, K.fg), textAlign: 'left', marginTop: 10}}>gibibyte</div>
							<div style={{display: 'flex', gap: 18, marginTop: 14, alignItems: 'baseline'}}>
								<span style={mono(44, K.accent)}>GiB</span>
								<span style={{fontFamily: K.font, fontWeight: 600, fontSize: 34, color: K.muted}}>= 1,073,741,824 bytes</span>
							</div>
							<div style={{position: 'absolute', right: 34, bottom: -34}}>
								<Stamp at={tNobody} color={K.muted} rotate={-6}>
									USED BY: ALMOST NOBODY
								</Stamp>
							</div>
						</Panel>
					</In>
				</div>
			)}
			{t >= tApple - 0.1 && (
				<Stack gap={60}>
						<In at={tApple - 0.1}>
							<div style={h1(84)}>
								since 2009, Macs
								<br />
								count in <span style={{color: K.accent}}>decimal</span>
							</div>
						</In>
					<div style={{display: 'flex', justifyContent: 'center', gap: 40}}>
						<Screen os="macOS" value="1 TB" color={K.accent} at={wordAt(sc, 'Macs') - 0.1} />
						<Screen os="WINDOWS" value="931 GB" color={K.blue} at={wordAt(sc, 'decimal') - 0.1} />
					</div>
						<In at={wordAt(sc, 'same') - 0.05}>
							<div style={h1(64, K.muted)}>
								same drive. <span style={{color: K.fg}}>different number.</span>
							</div>
						</In>
				</Stack>
			)}
		</SceneFrame>
	);
};

// ---------- 8. outro ----------
const Outro: React.FC<{sc: WhyScene; handle: string}> = ({sc, handle}) => {
	const lines: [string, string, string][] = [
		['Same', 'same drive.', K.fg],
		['bytes', 'same bytes.', K.fg],
		['different', 'different way of counting.', K.accent],
	];
	return (
		<SceneFrame sc={sc}>
			<div style={{...center, top: 260, gap: 10}}>
				{lines.map(([w, text, c]) => (
					<In key={text} at={wordAt(sc, w) - 0.1}>
						<div style={h1(text.length > 14 ? 76 : 100, c)}>{text}</div>
					</In>
				))}
				<In at={wordAt(sc, 'Follow') - 0.1} style={{marginTop: 50}}>
					<div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
						<div style={{fontFamily: K.font, fontWeight: 700, fontSize: 32, color: K.muted}}>follow for more</div>
						<div style={{...h1(50, K.fg)}}>why things are the way they are</div>
						<div style={{...mono(32, K.accent), marginTop: 4}}>{handle}</div>
					</div>
				</In>
			</div>
		</SceneFrame>
	);
};

// ---------- mascot direction ----------
type Pose = {x: number; y: number; s: number};
const CORNER: Pose = {x: 170, y: 1325, s: 0.68};

const useMascot = (scenes: WhyScene[], mouthArr: number[]) => {
	const frame = useCurrentFrame();
	const t = frame / 30;
	const by = Object.fromEntries(scenes.map((s) => [s.id, s]));
	const w = (id: string, word: string) => wordAt(by[id], word);
	const tNope = w('reveal', 'nope');
	const tFollow = w('outro', 'Follow');

	// position: pop in centre -> corner -> centre for the outro
	const center1: Pose = {x: 540, y: 1040, s: 1.45};
	const center2: Pose = {x: 540, y: 1150, s: 1.0};
	const toCorner = eio(t, by.langs.start - 0.1, by.langs.start + 0.55);
	const toEnd = eio(t, tFollow - 0.45, tFollow + 0.1);
	const lerpP = (a: Pose, b: Pose, k: number): Pose => ({x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, s: a.s + (b.s - a.s) * k});
	let pose = lerpP(lerpP(center1, CORNER, toCorner), center2, toEnd);
	// pop-in with overshoot
	const k = Math.max(0, Math.min(1, (t - (tNope - 0.08)) / 0.4));
	const overshoot = k <= 0 ? 0 : 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
	pose = {...pose, s: pose.s * (t < tNope - 0.08 ? 0 : Math.min(1.15, overshoot))};
	const squash = Math.max(0, 1 - Math.abs(t - (tNope + 0.35)) / 0.15);

	const exprs: [number, Expr][] = [
		[0, 'happy'],
		[w('reveal', "There's"), 'neutral'],
		[w('reveal', 'reason') - 0.1, 'thinking'],
		[by.langs.start, 'neutral'],
		[w('binary', 'right'), 'skeptical'],
		[by.gap.start, 'neutral'],
		[w('gap', '10%') - 0.05, 'surprised'],
		[by.math.start, 'neutral'],
		[w('math', '931') - 0.05, 'happy'],
		[w('math', 'gigabytes') - 0.05, 'skeptical'],
		[by.court.start, 'neutral'],
		[w('court', 'court') - 0.05, 'surprised'],
		[w('court', 'Western'), 'neutral'],
		[w('fix', 'nobody') - 0.05, 'skeptical'],
		[w('fix', 'since'), 'neutral'],
		[w('fix', 'Macs'), 'happy'],
		[by.outro.start, 'neutral'],
		[tFollow - 0.3, 'happy'],
	];
	const expr = [...exprs].reverse().find(([at]) => t >= at)![1];
	const pointAt = [w('binary', '1,024'), w('gap', '10%'), w('math', '931'), w('court', 'settled'), w('fix', 'decimal')];
	const pointing = pointAt.some((at) => t >= at - 0.1 && t < at + 1.2);
	const inCorner = toCorner > 0.5 && toEnd < 0.5;
	return {
		visible: t >= tNope - 0.1,
		pose,
		squash,
		expr,
		mouth: mouthArr[frame] ?? 0,
		look: inCorner ? {x: 0.7, y: -0.7} : {x: 0, y: 0},
		point: inCorner && pointing ? -42 : null,
		wave: t >= tFollow - 0.1,
	};
};

export const Why931: React.FC<WhyProps & {mouth: number[]}> = ({scenes, audio, handle, durationInFrames, mouth}) => {
	const frame = useCurrentFrame();
	const by = Object.fromEntries(scenes.map((s) => [s.id, s]));
	const m = useMascot(scenes, mouth);
	return (
		<AbsoluteFill style={{background: K.bg, overflow: 'hidden'}}>
			<Audio src={staticFile(audio)} />
			<Background />
			<Hook sc={by.hook} />
			<Reveal sc={by.reveal} />
			<Langs sc={by.langs} />
			<Binary sc={by.binary} />
			<Gap sc={by.gap} />
			<MathScene sc={by.math} />
			<Court sc={by.court} />
			<Fix sc={by.fix} />
			<Outro sc={by.outro} handle={handle} />
			{m.visible && <Mascot x={m.pose.x} y={m.pose.y} scale={m.pose.s} expr={m.expr} mouth={m.mouth} look={m.look} point={m.point} wave={m.wave} squash={m.squash} />}
			<Captions scenes={scenes} />
			<div style={{position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center'}}>
				<span style={{fontFamily: K.font, fontWeight: 800, fontSize: 24, letterSpacing: 6, color: K.muted}}>WHY IT’S LIKE THAT</span>
			</div>
			<div style={{position: 'absolute', top: 0, left: 0, height: 6, width: interpolate(frame, [0, durationInFrames - 1], [0, 1080]), background: K.accent}} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 60%, #000b 100%)', pointerEvents: 'none'}} />
		</AbsoluteFill>
	);
};
