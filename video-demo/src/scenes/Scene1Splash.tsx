import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
} from 'remotion';
import { PhoneFrame } from '../components/PhoneFrame';
import { LogoCluster } from '../components/LogoCluster';
import { COLORS, FONTS } from '../styles';

export const Scene1Splash: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo cluster scales from 0 to 1
  const clusterScale = spring({
    frame,
    fps,
    config: {
      damping: 12,
      stiffness: 80,
      mass: 0.8,
    },
  });

  // "Sensa" text fades in after cluster
  const sensaOpacity = spring({
    frame: frame - 40,
    fps,
    config: {
      damping: 20,
      stiffness: 60,
      mass: 1,
    },
  });

  // "Wellness" subtitle appears with delay
  const wellnessOpacity = spring({
    frame: frame - 70,
    fps,
    config: {
      damping: 20,
      stiffness: 60,
      mass: 1,
    },
  });

  const wellnessY = spring({
    frame: frame - 70,
    fps,
    config: {
      damping: 14,
      stiffness: 80,
      mass: 0.6,
    },
  });

  // Subheader fades in
  const subheaderOpacity = spring({
    frame: frame - 110,
    fps,
    config: {
      damping: 20,
      stiffness: 50,
      mass: 1,
    },
  });

  // Loading bar progress
  const loadingProgress = interpolate(frame, [120, 280], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <PhoneFrame>
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.bg,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 40,
        }}
      >
        {/* Logo cluster and Sensa text */}
        <div style={{ marginTop: -100 }}>
          <LogoCluster
            scale={clusterScale}
          />
        </div>

        {/* "Wellness" subtitle */}
        <div
          style={{
            fontFamily: FONTS.body,
            fontWeight: 500,
            fontSize: 42,
            color: COLORS.purple,
            opacity: wellnessOpacity,
            transform: `translateY(${interpolate(wellnessY, [0, 1], [20, 0])}px)`,
            marginTop: 5,
            letterSpacing: 6,
          }}
        >
          Wellness
        </div>

        {/* Subheader */}
        <div
          style={{
            fontFamily: FONTS.header,
            fontWeight: 300,
            fontSize: 28,
            color: COLORS.navy,
            opacity: subheaderOpacity,
            marginTop: 50,
            textAlign: 'center',
            lineHeight: 1.5,
            maxWidth: 600,
          }}
        >
          Putting Your Health Back into Your Hands
        </div>

        {/* Loading bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 60,
            right: 60,
          }}
        >
          <div
            style={{
              width: '100%',
              height: 6,
              backgroundColor: COLORS.lightGray,
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${loadingProgress}%`,
                height: '100%',
                backgroundColor: COLORS.coral,
                borderRadius: 3,
                transition: 'none',
              }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </PhoneFrame>
  );
};
