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

interface ResultCardProps {
  borderColor: string;
  title: string;
  value: string;
  description: string;
  opacity: number;
  translateY: number;
}

const ResultCard: React.FC<ResultCardProps> = ({
  borderColor,
  title,
  value,
  description,
  opacity,
  translateY,
}) => (
  <div
    style={{
      opacity,
      transform: `translateY(${translateY}px)`,
      backgroundColor: COLORS.white,
      borderRadius: 16,
      padding: '22px 24px',
      borderLeft: `5px solid ${borderColor}`,
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
      width: '100%',
    }}
  >
    <div
      style={{
        fontFamily: FONTS.body,
        fontWeight: 500,
        fontSize: 20,
        color: COLORS.gray,
        marginBottom: 6,
      }}
    >
      {title}
    </div>
    <div
      style={{
        fontFamily: FONTS.header,
        fontWeight: 700,
        fontSize: 28,
        color: COLORS.navy,
        marginBottom: 4,
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontFamily: FONTS.body,
        fontWeight: 500,
        fontSize: 18,
        color: borderColor,
      }}
    >
      {description}
    </div>
  </div>
);

export const Scene4Results: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header entrance
  const headerOpacity = spring({
    frame: frame - 10,
    fps,
    config: { damping: 20, stiffness: 60, mass: 1 },
  });

  // Score circle animation
  const scoreSpring = spring({
    frame: frame - 30,
    fps,
    config: {
      damping: 14,
      stiffness: 40,
      mass: 1,
    },
  });

  // Score arc: 62/100 = ~223 degrees out of 360
  const scoreAngle = scoreSpring * 223;

  // Score number count up
  const scoreNumber = Math.round(scoreSpring * 62);

  // "Moderate Inflammation" text
  const labelOpacity = spring({
    frame: frame - 80,
    fps,
    config: { damping: 20, stiffness: 60, mass: 1 },
  });

  // Card animations (staggered, slower)
  const card1Spring = spring({
    frame: frame - 130,
    fps,
    config: { damping: 12, stiffness: 70, mass: 0.8 },
  });
  const card2Spring = spring({
    frame: frame - 160,
    fps,
    config: { damping: 12, stiffness: 70, mass: 0.8 },
  });
  const card3Spring = spring({
    frame: frame - 190,
    fps,
    config: { damping: 12, stiffness: 70, mass: 0.8 },
  });

  // Button animation
  const buttonSpring = spring({
    frame: frame - 240,
    fps,
    config: { damping: 12, stiffness: 80, mass: 0.6 },
  });

  // Button pulse
  const buttonPulse = 1 + Math.sin((frame / fps) * Math.PI * 2) * 0.03;

  // Circular progress indicator using conic gradient
  const circleSize = 200;
  const borderWidth = 14;

  // Build the conic gradient for the score arc
  const conicGradient = `conic-gradient(
    from 0deg,
    ${COLORS.coral} 0deg,
    ${COLORS.coral} ${scoreAngle}deg,
    ${COLORS.lightGray} ${scoreAngle}deg,
    ${COLORS.lightGray} 360deg
  )`;

  return (
    <PhoneFrame>
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.bg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '40px 40px 30px',
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: headerOpacity,
            marginBottom: 5,
            marginTop: 20,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: FONTS.header,
              fontWeight: 700,
              fontSize: 36,
              color: COLORS.navy,
            }}
          >
            Your Results
          </div>
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 500,
              fontSize: 22,
              color: COLORS.gray,
              marginTop: 8,
            }}
          >
            March 8, 2026
          </div>
        </div>

        {/* Circular score indicator */}
        <div
          style={{
            position: 'relative',
            width: circleSize,
            height: circleSize,
            marginTop: 25,
            marginBottom: 15,
          }}
        >
          {/* Outer ring with score */}
          <div
            style={{
              width: circleSize,
              height: circleSize,
              borderRadius: '50%',
              background: conicGradient,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* Inner white circle */}
            <div
              style={{
                width: circleSize - borderWidth * 2,
                height: circleSize - borderWidth * 2,
                borderRadius: '50%',
                backgroundColor: COLORS.bg,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {/* Score number */}
              <div
                style={{
                  fontFamily: FONTS.header,
                  fontWeight: 700,
                  fontSize: 64,
                  color: COLORS.navy,
                  lineHeight: 1,
                }}
              >
                {scoreNumber}
              </div>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontWeight: 500,
                  fontSize: 22,
                  color: COLORS.gray,
                  marginTop: 4,
                }}
              >
                / 100
              </div>
            </div>
          </div>
        </div>

        {/* Inflammation label */}
        <div
          style={{
            fontFamily: FONTS.header,
            fontWeight: 700,
            fontSize: 26,
            color: COLORS.coral,
            opacity: labelOpacity,
            marginBottom: 30,
          }}
        >
          Moderate Inflammation
        </div>

        {/* Result cards */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            width: '100%',
            paddingLeft: 10,
            paddingRight: 10,
          }}
        >
          <ResultCard
            borderColor={COLORS.coral}
            title="CRP Level"
            value="4.2 mg/L"
            description="Above optimal range"
            opacity={card1Spring}
            translateY={interpolate(card1Spring, [0, 1], [30, 0])}
          />
          <ResultCard
            borderColor={COLORS.orange}
            title="IL-6 Marker"
            value="Detected"
            description="Elevated"
            opacity={card2Spring}
            translateY={interpolate(card2Spring, [0, 1], [30, 0])}
          />
          <ResultCard
            borderColor={COLORS.blue}
            title="TNF-a Activity"
            value="Normal"
            description="Within range"
            opacity={card3Spring}
            translateY={interpolate(card3Spring, [0, 1], [30, 0])}
          />
        </div>

        {/* View Your Plan button */}
        <div
          style={{
            marginTop: 30,
            opacity: buttonSpring,
            transform: `scale(${frame > 260 ? buttonPulse : buttonSpring})`,
          }}
        >
          <div
            style={{
              backgroundColor: COLORS.navy,
              borderRadius: 30,
              padding: '18px 60px',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                fontFamily: FONTS.header,
                fontWeight: 700,
                fontSize: 24,
                color: COLORS.white,
                textAlign: 'center',
              }}
            >
              View Your Plan
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </PhoneFrame>
  );
};
