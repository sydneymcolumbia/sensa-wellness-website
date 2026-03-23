import React from 'react';
import { staticFile, Img } from 'remotion';

interface LogoClusterProps {
  scale?: number;
  showText?: boolean;
  textOpacity?: number;
  textSize?: number;
}

export const LogoCluster: React.FC<LogoClusterProps> = ({
  scale = 1,
}) => {
  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Img
        src={staticFile('sensa-logo.jpg')}
        style={{
          width: 600,
          height: 'auto',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};
