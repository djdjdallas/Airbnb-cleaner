import { MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import { colors } from './colors';
import { fonts as typographyFonts, fontSizes } from './typography';

// Configure fonts for React Native Paper
const fontConfig = {
  displayLarge: {
    fontFamily: typographyFonts.bold,
    fontSize: 57,
    fontWeight: '700' as const,
    lineHeight: 64,
  },
  displayMedium: {
    fontFamily: typographyFonts.bold,
    fontSize: 45,
    fontWeight: '700' as const,
    lineHeight: 52,
  },
  displaySmall: {
    fontFamily: typographyFonts.bold,
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 44,
  },
  headlineLarge: {
    fontFamily: typographyFonts.bold,
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  headlineMedium: {
    fontFamily: typographyFonts.semiBold,
    fontSize: 28,
    fontWeight: '600' as const,
    lineHeight: 36,
  },
  headlineSmall: {
    fontFamily: typographyFonts.semiBold,
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  titleLarge: {
    fontFamily: typographyFonts.semiBold,
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  titleMedium: {
    fontFamily: typographyFonts.semiBold,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  titleSmall: {
    fontFamily: typographyFonts.semiBold,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  bodyLarge: {
    fontFamily: typographyFonts.regular,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: typographyFonts.regular,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: typographyFonts.regular,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  labelLarge: {
    fontFamily: typographyFonts.semiBold,
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: typographyFonts.semiBold,
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: typographyFonts.semiBold,
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
};

export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.rausch,
    secondary: colors.babu,
    tertiary: colors.info,
    error: colors.error,
    background: colors.background,
    surface: colors.white,
    surfaceVariant: colors.backgroundSecondary,
    onPrimary: colors.white,
    onSecondary: colors.white,
    onBackground: colors.hof,
    onSurface: colors.hof,
    outline: colors.border,
    elevation: {
      level0: 'transparent',
      level1: colors.white,
      level2: colors.white,
      level3: colors.white,
      level4: colors.white,
      level5: colors.white,
    },
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 12,
};

// Export all design constants
export { colors } from './colors';
export { spacing, borderRadius, iconSizes, shadows, hitSlop } from './spacing';
export {
  fonts,
  fontWeights,
  fontSizes,
  lineHeights,
  textStyles,
} from './typography';
