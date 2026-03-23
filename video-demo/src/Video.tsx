import React from 'react';
import { AbsoluteFill, Series } from 'remotion';
import { Scene0Logo } from './scenes/Scene0Logo';
import { Scene1Splash } from './scenes/Scene1Splash';
import { Scene2Camera } from './scenes/Scene2Camera';
import { Scene3Scanning } from './scenes/Scene3Scanning';
import { Scene4Results } from './scenes/Scene4Results';
import { Scene5Protocol } from './scenes/Scene5Protocol';
import { COLORS } from './styles';

// To add audio, place your audio file in public/ and uncomment:
// import { Audio, staticFile } from 'remotion';
// Then add inside the AbsoluteFill below:
// <Audio src={staticFile('audio/background-music.mp3')} volume={0.5} />

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;700&family=Quicksand:wght@500&display=swap');`}
      </style>
      <Series>
        <Series.Sequence durationInFrames={240}>
          <Scene0Logo />
        </Series.Sequence>
        <Series.Sequence durationInFrames={300}>
          <Scene1Splash />
        </Series.Sequence>
        <Series.Sequence durationInFrames={360}>
          <Scene2Camera />
        </Series.Sequence>
        <Series.Sequence durationInFrames={360}>
          <Scene3Scanning />
        </Series.Sequence>
        <Series.Sequence durationInFrames={360}>
          <Scene4Results />
        </Series.Sequence>
        <Series.Sequence durationInFrames={420}>
          <Scene5Protocol />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
