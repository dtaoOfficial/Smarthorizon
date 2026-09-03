import React from 'react';
import { CircuitBackground, CircuitBackgroundProps } from './CircuitBackground';

export type HexagonBackgroundProps = CircuitBackgroundProps & {
  hexagonSize?: number;
  hexagonMargin?: number;
  hexagonProps?: any;
  animationSpeed?: number;
};

export const HexagonBackground: React.FC<HexagonBackgroundProps> = (props) => {
  return <CircuitBackground {...props} />;
};

export default HexagonBackground;
