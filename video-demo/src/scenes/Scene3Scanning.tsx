import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  interpolateColors,
  AbsoluteFill,
} from 'remotion';
import { PhoneFrame } from '../components/PhoneFrame';
import { COLORS, FONTS } from '../styles';

export const Scene3Scanning: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Color transition for the central circle (slower)
  const circleColor = interpolateColors(
    frame,
    [0, 60, 140, 220, 280],
    [COLORS.lightGray, COLORS.yellow, COLORS.orange, '#e8a020', COLORS.orange]
  );

  // Pulsing ring animation around the circle
  const pulse1Scale = 1 + Math.sin((frame / fps) * Math.PI * 3) * 0.08;
  const pulse2Scale = 1 + Math.sin((frame / fps) * Math.PI * 3 + 1) * 0.12;
  const pulse3Scale = 1 + Math.sin((frame / fps) * Math.PI * 3 + 2) * 0.06;

  // Ring opacity fades out after scanning is done
  const ringOpacity = interpolate(frame, [260, 310], [0.3, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Progress bar fills from 0 to 100 (slower)
  const progressRaw = interpolate(frame, [20, 290], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const progressSpring = spring({
    frame,
    fps,
    config: {
      damping: 100,
      stiffness: 20,
      mass: 1,
    },
  });
  const progress = Math.min(progressRaw, 100);

  // Status text transitions (doubled thresholds)
  const getStatusText = (): string => {
    if (frame < 100) return 'Scanning...';
    if (frame < 200) return 'Matching...';
    return 'CRP Level: 4.2 mg/L';
  };

  // Header entrance
  const headerOpacity = spring({
    frame: frame - 10,
    fps,
    config: { damping: 20, stiffness: 60, mass: 1 },
  });

  // Checkmark appears at 100%
  const checkmarkScale = spring({
    frame: frame - 300,
    fps,
    config: {
      damping: 10,
      stiffness: 100,
      mass: 0.5,
    },
  });

  // "Analysis Complete" text
  const completeOpacity = spring({
    frame: frame - 310,
    fps,
    config: { damping: 20, stiffness: 60, mass: 1 },
  });

  const isComplete = frame >= 300;
  const circleSize = 250;

  return (
    <PhoneFrame>
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.bg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '60px 40px',
        }}
      >
        {/* Header */}
        <div
          style={{
            fontFamily: FONTS.header,
            fontWeight: 700,
            fontSize: 38,
            color: COLORS.navy,
            opacity: headerOpacity,
            marginBottom: 60,
            marginTop: 30,
          }}
        >
          Analyzing Sample
        </div>

        {/* Central color circle with pulse rings */}
        <div
          style={{
            position: 'relative',
            width: circleSize + 100,
            height: circleSize + 100,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 50,
          }}
        >
          {/* Pulse ring 1 */}
          <div
            style={{
              position: 'absolute',
              width: circleSize + 40,
              height: circleSize + 40,
              borderRadius: '50%',
              border: `3px solid ${COLORS.orange}`,
              opacity: ringOpacity,
              transform: `scale(${pulse1Scale})`,
            }}
          />
          {/* Pulse ring 2 */}
          <div
            style={{
              position: 'absolute',
              width: circleSize + 70,
              height: circleSize + 70,
              borderRadius: '50%',
              border: `2px solid ${COLORS.yellow}`,
              opacity: ringOpacity * 0.6,
              transform: `scale(${pulse2Scale})`,
            }}
          />
          {/* Pulse ring 3 */}
          <div
            style={{
              position: 'absolute',
              width: circleSize + 95,
              height: circleSize + 95,
              borderRadius: '50%',
              border: `1px solid ${COLORS.coral}`,
              opacity: ringOpacity * 0.3,
              transform: `scale(${pulse3Scale})`,
            }}
          />

          {/* Main color circle */}
          <div
            style={{
              width: circleSize,
              height: circleSize,
              borderRadius: '50%',
              backgroundColor: circleColor,
              boxShadow: `0 8px 30px rgba(0, 0, 0, 0.15)`,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* Checkmark on completion */}
            {isComplete && (
              <div
                style={{
                  transform: `scale(${checkmarkScale})`,
                  width: 70,
                  height: 70,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {/* CSS checkmark using rotated borders */}
                <div
                  style={{
                    width: 45,
                    height: 25,
                    borderBottom: `6px solid ${COLORS.white}`,
                    borderLeft: `6px solid ${COLORS.white}`,
                    transform: 'rotate(-45deg)',
                    marginTop: -10,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Status text readout */}
        <div
          style={{
            fontFamily: FONTS.body,
            fontWeight: 500,
            fontSize: 30,
            color: COLORS.navy,
            marginBottom: 50,
            height: 40,
            textAlign: 'center',
          }}
        >
          {getStatusText()}
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: '85%',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              height: 14,
              backgroundColor: COLORS.lightGray,
              borderRadius: 7,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: `linear-gradient(to right, ${COLORS.blue}, ${COLORS.purple})`,
                borderRadius: 7,
              }}
            />
          </div>
        </div>

        {/* Percentage text */}
        <div
          style={{
            fontFamily: FONTS.body,
            fontWeight: 500,
            fontSize: 22,
            color: COLORS.gray,
          }}
        >
          {Math.round(progress)}%
        </div>

        {/* Analysis Complete text */}
        {isComplete && (
          <div
            style={{
              fontFamily: FONTS.header,
              fontWeight: 700,
              fontSize: 28,
              color: COLORS.navy,
              opacity: completeOpacity,
              marginTop: 40,
            }}
          >
            Analysis Complete
          </div>
        )}
      </AbsoluteFill>
    </PhoneFrame>
  );
};
