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

interface ProtocolCardProps {
  accentColor: string;
  title: string;
  body: string;
  tagText: string;
  tagColor: string;
  opacity: number;
  translateY: number;
}

const ProtocolCard: React.FC<ProtocolCardProps> = ({
  accentColor,
  title,
  body,
  tagText,
  tagColor,
  opacity,
  translateY,
}) => (
  <div
    style={{
      opacity,
      transform: `translateY(${translateY}px)`,
      backgroundColor: COLORS.white,
      borderRadius: 16,
      padding: '20px 22px',
      borderLeft: `5px solid ${accentColor}`,
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
      width: '100%',
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.header,
          fontWeight: 700,
          fontSize: 22,
          color: COLORS.navy,
          flex: 1,
        }}
      >
        {title}
      </div>
      {/* Tag pill */}
      <div
        style={{
          backgroundColor: tagColor,
          borderRadius: 20,
          padding: '4px 14px',
          flexShrink: 0,
          marginLeft: 10,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.body,
            fontWeight: 500,
            fontSize: 14,
            color: COLORS.white,
          }}
        >
          {tagText}
        </div>
      </div>
    </div>
    <div
      style={{
        fontFamily: FONTS.body,
        fontWeight: 500,
        fontSize: 17,
        color: '#555555',
        lineHeight: 1.45,
      }}
    >
      {body}
    </div>
  </div>
);

export const Scene5Protocol: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = 420;

  // Header entrance
  const headerOpacity = spring({
    frame: frame - 10,
    fps,
    config: { damping: 20, stiffness: 60, mass: 1 },
  });

  const subtitleOpacity = spring({
    frame: frame - 30,
    fps,
    config: { damping: 20, stiffness: 60, mass: 1 },
  });

  // Card animations (staggered slide-in from bottom, slower)
  const card1Spring = spring({
    frame: frame - 50,
    fps,
    config: { damping: 12, stiffness: 60, mass: 0.8 },
  });
  const card2Spring = spring({
    frame: frame - 90,
    fps,
    config: { damping: 12, stiffness: 60, mass: 0.8 },
  });
  const card3Spring = spring({
    frame: frame - 130,
    fps,
    config: { damping: 12, stiffness: 60, mass: 0.8 },
  });
  const card4Spring = spring({
    frame: frame - 170,
    fps,
    config: { damping: 12, stiffness: 60, mass: 0.8 },
  });

  // Set Reminders button
  const buttonSpring = spring({
    frame: frame - 210,
    fps,
    config: { damping: 12, stiffness: 80, mass: 0.6 },
  });

  // Final overlay: logo + URL appear in last 3 seconds (90 frames)
  const overlayStart = totalFrames - 90;
  const overlayOpacity = spring({
    frame: frame - overlayStart,
    fps,
    config: { damping: 20, stiffness: 60, mass: 1 },
  });

  const logoScale = spring({
    frame: frame - overlayStart,
    fps,
    config: { damping: 12, stiffness: 80, mass: 0.6 },
  });

  const urlOpacity = spring({
    frame: frame - (overlayStart + 25),
    fps,
    config: { damping: 20, stiffness: 50, mass: 1 },
  });

  const showOverlay = frame >= overlayStart;

  return (
    <PhoneFrame>
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.bg,
          display: 'flex',
          flexDirection: 'column',
          padding: '30px 30px 20px',
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: headerOpacity,
            marginBottom: 4,
            marginTop: 15,
          }}
        >
          <div
            style={{
              fontFamily: FONTS.header,
              fontWeight: 700,
              fontSize: 34,
              color: COLORS.navy,
            }}
          >
            Your Personalized Plan
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONTS.body,
            fontWeight: 500,
            fontSize: 20,
            color: COLORS.gray,
            opacity: subtitleOpacity,
            marginBottom: 24,
          }}
        >
          Based on your inflammation score of 62
        </div>

        {/* Protocol cards */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            flex: 1,
          }}
        >
          <ProtocolCard
            accentColor={COLORS.coral}
            title="Anti-Inflammatory Nutrition"
            body="Increase omega-3 intake through fatty fish, walnuts, and flaxseed. Reduce processed sugars and refined carbohydrates."
            tagText="High Priority"
            tagColor={COLORS.coral}
            opacity={card1Spring}
            translateY={interpolate(card1Spring, [0, 1], [50, 0])}
          />
          <ProtocolCard
            accentColor={COLORS.orange}
            title="Movement Protocol"
            body="30 minutes of moderate exercise daily. Focus on walking, swimming, or yoga to reduce systemic inflammation."
            tagText="Recommended"
            tagColor={COLORS.orange}
            opacity={card2Spring}
            translateY={interpolate(card2Spring, [0, 1], [50, 0])}
          />
          <ProtocolCard
            accentColor={COLORS.blue}
            title="Sleep Optimization"
            body="Target 7-9 hours nightly. Maintain consistent sleep and wake times to regulate inflammatory cytokine production."
            tagText="Recommended"
            tagColor={COLORS.blue}
            opacity={card3Spring}
            translateY={interpolate(card3Spring, [0, 1], [50, 0])}
          />
          <ProtocolCard
            accentColor={COLORS.purple}
            title="Retest Schedule"
            body="Retest in 14 days to track your progress. Consistent monitoring helps identify what works for your body."
            tagText="Scheduled"
            tagColor={COLORS.purple}
            opacity={card4Spring}
            translateY={interpolate(card4Spring, [0, 1], [50, 0])}
          />
        </div>

        {/* Set Reminders button */}
        <div
          style={{
            opacity: buttonSpring,
            transform: `translateY(${interpolate(buttonSpring, [0, 1], [20, 0])}px)`,
            marginTop: 16,
            marginBottom: 10,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: COLORS.navy,
              borderRadius: 30,
              padding: '16px 50px',
            }}
          >
            <div
              style={{
                fontFamily: FONTS.header,
                fontWeight: 700,
                fontSize: 22,
                color: COLORS.white,
                textAlign: 'center',
              }}
            >
              Set Reminders
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* Final overlay with logo and URL */}
      {showOverlay && (
        <AbsoluteFill
          style={{
            backgroundColor: `rgba(255, 255, 247, ${overlayOpacity * 0.92})`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ transform: `scale(${logoScale * 0.7})` }}>
            <LogoCluster scale={1} />
          </div>
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 500,
              fontSize: 28,
              color: COLORS.purple,
              opacity: urlOpacity,
              marginTop: 20,
              letterSpacing: 1,
            }}
          >
            sensawellness.org
          </div>
        </AbsoluteFill>
      )}
    </PhoneFrame>
  );
};
