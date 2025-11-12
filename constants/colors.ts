/**
 * Airbnb-inspired color palette
 * https://www.airbnb.com/design
 */

export const colors = {
  // Primary colors
  rausch: '#FF5A5F', // Airbnb coral red - primary brand color
  babu: '#00A699', // Teal - success states and accents

  // Neutrals
  white: '#FFFFFF',
  foggy: '#767676', // Secondary text
  hof: '#484848', // Primary text

  // Backgrounds
  background: '#FFFFFF',
  backgroundSecondary: '#F7F7F7',

  // Status colors
  success: '#00A699',
  error: '#D93900',
  warning: '#FFB400',
  info: '#008489',

  // Semantic colors
  pending: '#FFB400',
  confirmed: '#00A699',
  completed: '#008489',
  cancelled: '#D93900',

  // Borders and dividers
  border: '#EBEBEB',
  divider: '#EBEBEB',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',

  // Shadows
  shadowColor: '#000000',
} as const;

export type ColorName = keyof typeof colors;
