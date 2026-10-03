export type PinState = 'available' | 'closed' | 'planned' | 'maintenance';
export type PinKind = 'station' | 'collection_point';
/** Partner-controlled. Max 3 colours are drawn. */
export interface PinFrame { pattern: 'solid' | 'stripes' | 'rings'; colors: string[] }
/** Mirrors the backend `pin` payload. Fill and icon are NOT here on purpose — uCollect owns them. */
export interface PinSpec { state?: PinState; kind?: PinKind; frame?: PinFrame | null; banner?: 'NEW' | 'PROMO' | null }
export interface PinOptions {
  /** On-screen width (px) of an unframed pin canvas. Default 40. */
  size?: number;
  /** Frame thickness in pin units (3–7 tested). Default 5. */
  frameWidth?: number;
  bannerPosition?: 'mid' | 'low';
  bannerScale?: number;
  badgePosition?: 'top-left' | 'top-right';
  badgeRadius?: number;
}
export interface ResolvedPin {
  state: PinState; kind: PinKind; fill: string; icon: 'uco' | 'house' | 'x'; opacity: number;
  frame: PinFrame | null; banner: 'SOON' | 'NEW' | 'PROMO' | null; badge: 'clock' | null;
}
export const VIEWBOX: [number, number, number, number];
export const DEFAULTS: Required<Omit<PinOptions, 'size'>>;
export function resolvePin(spec?: PinSpec): ResolvedPin;
export function pinSvg(spec?: PinSpec, options?: PinOptions): string;
export function pinImageKey(spec?: PinSpec, options?: PinOptions): string;
export function pinZ(spec?: PinSpec): 1 | 2 | 3 | 4;
