import type { ReactElement } from 'react';
import type { PinProps } from './index.js';

export interface MapPinProps extends PinProps {
  readonly className?: string;
  /** Accessible name. Omit for a decorative pin (rendered aria-hidden). */
  readonly 'aria-label'?: string;
}

export function MapPin(props: MapPinProps): ReactElement;
