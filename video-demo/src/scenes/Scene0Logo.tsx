import React from 'react';
import { OffthreadVideo, staticFile, AbsoluteFill } from 'remotion';
import { COLORS } from '../styles';

export const Scene0Logo: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.white,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <OffthreadVideo
        src={staticFile('animated-logo.mp4')}
        style={{
          width: 1080,
          height: 608,
          objectFit: 'contain',
        }}
      />
    </AbsoluteFill>
  );
};
