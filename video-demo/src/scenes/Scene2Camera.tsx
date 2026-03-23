import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
} from 'remotion';
import { PhoneFrame } from '../components/PhoneFrame';
import { COLORS, FONTS } from '../styles';

export const Scene2Camera: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Corner bracket pulse animation (looping)
  const pulsePhase = Math.sin((frame / fps) * Math.PI * 2 * 0.8);
  const bracketScale = 1 + pulsePhase * 0.02;

  // Scanning line moves top to bottom repeatedly (slower cycle)
  const scanCycle = 150;
  const scanProgress = (frame % scanCycle) / scanCycle;
  const scanLineY = interpolate(scanProgress, [0, 1], [0, 320]);

  // Capture button press at frame 200
  const buttonPress = spring({
    frame: frame - 200,
    fps,
    config: {
      damping: 8,
      stiffness: 200,
      mass: 0.4,
    },
  });
  const buttonScale = frame >= 200 && frame < 230
    ? interpolate(frame, [200, 214, 230], [1, 0.85, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  // Flash effect at end of scene
  const flashOpacity = interpolate(frame, [310, 320, 340, 360], [0, 0.9, 0.3, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Text entrance
  const topTextOpacity = spring({
    frame: frame - 10,
    fps,
    config: { damping: 20, stiffness: 60, mass: 1 },
  });

  const bottomTextOpacity = spring({
    frame: frame - 30,
    fps,
    config: { damping: 20, stiffness: 60, mass: 1 },
  });

  // Viewfinder dimensions
  const vfWidth = 340;
  const vfHeight = 380;
  const bracketLength = 50;
  const bracketThickness = 4;

  const cornerBracketStyle = (
    top: boolean,
    left: boolean
  ): React.CSSProperties => ({
    position: 'absolute' as const,
    top: top ? -bracketThickness : undefined,
    bottom: !top ? -bracketThickness : undefined,
    left: left ? -bracketThickness : undefined,
    right: !left ? -bracketThickness : undefined,
    width: bracketLength,
    height: bracketLength,
    borderColor: COLORS.coral,
    borderStyle: 'solid',
    borderWidth: 0,
    borderTopWidth: top ? bracketThickness : 0,
    borderBottomWidth: !top ? bracketThickness : 0,
    borderLeftWidth: left ? bracketThickness : 0,
    borderRightWidth: !left ? bracketThickness : 0,
    borderTopLeftRadius: top && left ? 12 : 0,
    borderTopRightRadius: top && !left ? 12 : 0,
    borderBottomLeftRadius: !top && left ? 12 : 0,
    borderBottomRightRadius: !top && !left ? 12 : 0,
  });

  return (
    <PhoneFrame screenBackground={COLORS.darkBg}>
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.darkBg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
        }}
      >
        {/* Top instruction text */}
        <div
          style={{
            fontFamily: FONTS.header,
            fontWeight: 700,
            fontSize: 32,
            color: COLORS.white,
            textAlign: 'center',
            marginBottom: 50,
            opacity: topTextOpacity,
          }}
        >
          Position your Sensa vial
        </div>

        {/* Viewfinder frame */}
        <div
          style={{
            width: vfWidth,
            height: vfHeight,
            position: 'relative',
            transform: `scale(${bracketScale})`,
          }}
        >
          {/* Corner brackets */}
          <div style={cornerBracketStyle(true, true)} />
          <div style={cornerBracketStyle(true, false)} />
          <div style={cornerBracketStyle(false, true)} />
          <div style={cornerBracketStyle(false, false)} />

          {/* Vial illustration */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Vial cap */}
            <div
              style={{
                width: 40,
                height: 20,
                backgroundColor: COLORS.navy,
                borderRadius: '6px 6px 0 0',
              }}
            />
            {/* Vial body */}
            <div
              style={{
                width: 60,
                height: 120,
                borderRadius: '4px 4px 20px 20px',
                background: `linear-gradient(to bottom, ${COLORS.blue}, ${COLORS.purple})`,
                border: `2px solid rgba(255, 255, 255, 0.2)`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Liquid level shine effect */}
              <div
                style={{
                  position: 'absolute',
                  left: 8,
                  top: 10,
                  width: 8,
                  height: 40,
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  borderRadius: 4,
                }}
              />
            </div>
          </div>

          {/* Scanning line */}
          <div
            style={{
              position: 'absolute',
              left: 10,
              right: 10,
              top: scanLineY,
              height: 2,
              backgroundColor: COLORS.coral,
              opacity: 0.8,
              boxShadow: `0 0 12px ${COLORS.coral}`,
            }}
          />
        </div>

        {/* Bottom instruction text */}
        <div
          style={{
            fontFamily: FONTS.body,
            fontWeight: 500,
            fontSize: 24,
            color: COLORS.lightGray,
            textAlign: 'center',
            marginTop: 50,
            opacity: bottomTextOpacity,
          }}
        >
          Hold steady for best results
        </div>

        {/* Capture button */}
        <div
          style={{
            marginTop: 60,
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: `4px solid ${COLORS.coral}`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transform: `scale(${buttonScale})`,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: COLORS.white,
            }}
          />
        </div>

        {/* Flash effect overlay */}
        <AbsoluteFill
          style={{
            backgroundColor: COLORS.white,
            opacity: flashOpacity,
            pointerEvents: 'none',
          }}
        />
      </AbsoluteFill>
    </PhoneFrame>
  );
};
