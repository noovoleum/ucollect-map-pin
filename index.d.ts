export type PinState = 'available' | 'closed' | 'planned' | 'maintenance';
export type PinKind = 'station' | 'collection_point';
export type FramePattern = 'solid' | 'stripes' | 'rings';
export type PinBanner = 'soon' | 'new' | 'promo';

/** Partner frame. Only the first 3 entries are read; each must be a `#RRGGBB` string or it is skipped. */
export interface PinFrame {
  readonly pattern: FramePattern;
  readonly colors: readonly string[];
}

export interface PinProps {
  readonly state: PinState;
  readonly kind: PinKind;
  readonly frame?: PinFrame | null;
  readonly banner?: PinBanner | null;
  /** Height of an unframed pin, pole tip to head tip, in px/dp. Default 34. Clamped to 8..512. */
  readonly size?: number;
}

export const STATES: readonly PinState[];
export const KINDS: readonly PinKind[];
export const FRAME_PATTERNS: readonly FramePattern[];
export const BANNERS: readonly PinBanner[];

/** Head fill (`#RRGGBB`) and group opacity the pin uses for a state; the same for both kinds. */
export interface PinStateColor {
  readonly fill: string;
  readonly opacity: number;
}

/** Per-state pin colours, for companions drawn beside the pin (e.g. zoomed-out dots). Frozen. */
export const STATE_COLORS: Readonly<Record<PinState, PinStateColor>>;

/** SVG markup. Throws TypeError on an unknown enum value or a NaN/non-number size. */
export function pinSvg(props: PinProps): string;
