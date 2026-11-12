import { createTheme } from '@mantine/core';

/** Global look and feel. See https://mantine.dev/theming/theme-object/ for everything that can be set here. */
export const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: { fontWeight: '600' },
  components: {
    Card: { defaultProps: { withBorder: true, shadow: 'none' } },
    Paper: { defaultProps: { withBorder: true } },
  },
});
