import React from 'react';
import { Composition } from 'remotion';
import { Video } from './Video';

export const Root: React.FC = () => {
  return (
    <Composition
      id="SensaDemo"
      component={Video}
      durationInFrames={2040}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
