import type { HTMLAttributes } from 'react';
import type { PinSpec, PinOptions } from './index';
export interface MapPinProps extends PinSpec, Omit<HTMLAttributes<HTMLSpanElement>, 'dangerouslySetInnerHTML'> {
  size?: number;
  options?: Omit<PinOptions, 'size'>;
}
export function MapPin(props: MapPinProps): JSX.Element;
export function pinDataUrl(spec?: PinSpec, options?: PinOptions): string;
