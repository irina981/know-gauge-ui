import { createTheme, type MantineColorsTuple } from '@mantine/core';

/**
 * KnowGauge brand.
 *
 * The colours come from the logo (public/favicon.svg): an indigo tile (#4c6ef5 → #3b5bdb) and a lime
 * "gauge" needle (#40c057 → #a9e34b). Violet is used next to indigo for AI accents (gradients).
 * See https://mantine.dev/theming/theme-object/ for everything that can be set here.
 */
const brand: MantineColorsTuple = [
  '#edf2ff',
  '#dbe4ff',
  '#bac8ff',
  '#91a7ff',
  '#748ffc',
  '#5c7cfa',
  '#4c6ef5', // 6: main brand colour
  '#4263eb',
  '#3b5bdb',
  '#364fc7',
];

const needle: MantineColorsTuple = [
  '#f4fce3',
  '#e9fac8',
  '#d8f5a2',
  '#c0eb75',
  '#a9e34b',
  '#94d82d',
  '#82c91e',
  '#74b816',
  '#66a80f',
  '#5c940d',
];

/**
 * Dark mode palette: navy-tinted and lighter than Mantine's default, for better contrast.
 * Mantine uses [0] for text, [2] for dimmed text, [4] for borders, [6] for inputs and [7] for the page.
 */
const dark: MantineColorsTuple = [
  '#eef0fa',
  '#d3d8ee',
  '#a9b0cf',
  '#7d86ab',
  '#4f5a86',
  '#3a4472',
  '#2c3561',
  '#222a52',
  '#1b2246',
  '#151b3a',
];

export const theme = createTheme({
  colors: { brand, needle, dark },
  primaryColor: 'brand',
  primaryShade: { light: 6, dark: 5 },
  // Used by every `variant="gradient"` component without its own gradient: the "AI" look.
  defaultGradient: { from: 'brand.6', to: 'violet.6', deg: 135 },
  defaultRadius: 'md',
  fontFamily: '"Inter Variable", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headings: {
    fontFamily: '"Plus Jakarta Sans Variable", "Inter Variable", sans-serif',
    fontWeight: '700',
  },
  shadows: {
    xs: '0 1px 2px rgba(16, 24, 64, 0.06)',
    sm: '0 1px 3px rgba(16, 24, 64, 0.06), 0 4px 12px rgba(16, 24, 64, 0.04)',
    md: '0 4px 12px rgba(16, 24, 64, 0.08), 0 12px 32px rgba(16, 24, 64, 0.06)',
  },
  components: {
    Card: { defaultProps: { withBorder: true, shadow: 'sm', radius: 'lg' } },
    Paper: { defaultProps: { withBorder: true, shadow: 'sm', radius: 'lg' } },
    Button: { defaultProps: { radius: 'md' } },
    Badge: { defaultProps: { radius: 'sm' } },
    Modal: { defaultProps: { radius: 'lg', overlayProps: { blur: 3, backgroundOpacity: 0.45 } } },
    Tooltip: { defaultProps: { withArrow: true } },
  },
});
