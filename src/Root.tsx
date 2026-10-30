import React from 'react';
import {Composition, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {Reel} from './Reel';
import {FPS, ReelProps} from './lib';
import defaults from '../public/01-whatsapp/props.json';
import why931 from '../public/02-931gb/props.json';
import {Why931} from './why/Why931';

for (const [file, weight] of [
	['Inter-Medium.otf', '500'],
	['Inter-SemiBold.otf', '600'],
	['Inter-Bold.otf', '700'],
	['Inter-ExtraBold.otf', '800'],
	['Inter-Black.otf', '900'],
] as const) {
	loadFont({family: 'Inter', url: staticFile(`fonts/${file}`), weight});
}
loadFont({family: 'JetBrains Mono', url: staticFile('fonts/JetBrainsMono-Bold.ttf'), weight: '700'});

export const Root: React.FC = () => (
	<>
	<Composition
		id="Why931"
		component={Why931}
		width={1080}
		height={1920}
		fps={FPS}
		durationInFrames={why931.durationInFrames}
		defaultProps={why931 as any}
		calculateMetadata={({props}) => ({durationInFrames: (props as any).durationInFrames})}
	/>
	<Composition
		id="Reel"
		component={Reel}
		width={1080}
		height={1920}
		fps={FPS}
		durationInFrames={(defaults as ReelProps).durationInFrames}
		defaultProps={defaults as ReelProps}
		calculateMetadata={({props}) => ({durationInFrames: props.durationInFrames})}
	/>
	</>
);
