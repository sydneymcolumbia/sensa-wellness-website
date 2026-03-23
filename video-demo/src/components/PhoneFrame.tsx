import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COLORS, FONTS } from '../styles';

interface PhoneFrameProps {
  children: React.ReactNode;
  screenBackground?: string;
}

const PHONE_WIDTH = 800;
const PHONE_HEIGHT = 1600;
const BORDER_RADIUS = 50;
const STATUS_BAR_HEIGHT = 70;
const HOME_BAR_HEIGHT = 40;

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  screenBackground = COLORS.bg,
}) => {
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
      }}
    >
      {/* Phone outer shell */}
      <div
        style={{
          width: PHONE_WIDTH,
          height: PHONE_HEIGHT,
          borderRadius: BORDER_RADIUS,
          border: `4px solid ${COLORS.darkBg}`,
          backgroundColor: COLORS.darkBg,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Status bar */}
        <div
          style={{
            height: STATUS_BAR_HEIGHT,
            backgroundColor: screenBackground,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 30px',
            flexShrink: 0,
          }}
        >
          {/* Time */}
          <span
            style={{
              fontFamily: FONTS.header,
              fontWeight: 700,
              fontSize: 26,
              color: screenBackground === COLORS.darkBg ? COLORS.white : COLORS.darkBg,
            }}
          >
            9:41
          </span>

          {/* Notch / Dynamic Island */}
          <div
            style={{
              width: 160,
              height: 32,
              backgroundColor: COLORS.darkBg,
              borderRadius: 20,
            }}
          />

          {/* Right icons: signal, wifi, battery */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* Signal bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
              {[8, 12, 16, 20].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: 4,
                    height: h,
                    backgroundColor: screenBackground === COLORS.darkBg ? COLORS.white : COLORS.darkBg,
                    borderRadius: 1,
                  }}
                />
              ))}
            </div>

            {/* Battery */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 18,
                  borderRadius: 4,
                  border: `2px solid ${screenBackground === COLORS.darkBg ? COLORS.white : COLORS.darkBg}`,
                  padding: 2,
                  display: 'flex',
                  alignItems: 'stretch',
                }}
              >
                <div
                  style={{
                    flex: 0.8,
                    backgroundColor: screenBackground === COLORS.darkBg ? COLORS.white : COLORS.darkBg,
                    borderRadius: 2,
                  }}
                />
              </div>
              <div
                style={{
                  width: 3,
                  height: 8,
                  backgroundColor: screenBackground === COLORS.darkBg ? COLORS.white : COLORS.darkBg,
                  borderRadius: '0 2px 2px 0',
                }}
              />
            </div>
          </div>
        </div>

        {/* Screen content area */}
        <div
          style={{
            flex: 1,
            backgroundColor: screenBackground,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {children}
        </div>

        {/* Home indicator bar */}
        <div
          style={{
            height: HOME_BAR_HEIGHT,
            backgroundColor: screenBackground,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 180,
              height: 6,
              backgroundColor: screenBackground === COLORS.darkBg ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
              borderRadius: 3,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
