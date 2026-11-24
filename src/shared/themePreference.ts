import { useMantineColorScheme, type MantineColorScheme } from '@mantine/core';
import { useEffect } from 'react';
import { usePreferences, useUpdatePreferences } from '@/api/account';
import type { ThemePreference } from '@/api/types';
import { useSession } from '@/app/auth';

const TO_SCHEME: Record<ThemePreference, MantineColorScheme> = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'auto',
};

function fromScheme(scheme: MantineColorScheme): ThemePreference {
  return scheme === 'light' ? 'LIGHT' : scheme === 'dark' ? 'DARK' : 'SYSTEM';
}

/**
 * The theme the user chose. Mantine keeps it in this browser, so it applies at once on the next visit; for a
 * signed-in user it is also stored on the account (`/api/me/preferences`), so it follows them to other devices.
 */
export function useThemePreference() {
  const session = useSession();
  const canStore = session.enabled && session.isAuthenticated;
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { data: preferences } = usePreferences(canStore);
  const update = useUpdatePreferences();

  const setTheme = (theme: ThemePreference) => {
    setColorScheme(TO_SCHEME[theme]);
    if (canStore) update.mutate({ ...preferences, theme });
  };
  return { theme: fromScheme(colorScheme), setTheme, saving: update.isPending };
}

/** Applies the theme stored on the account, e.g. after signing in on another device. Rendered by the app frame. */
export function useApplyStoredTheme() {
  const session = useSession();
  const { data: preferences } = usePreferences(session.enabled && session.isAuthenticated);
  const { setColorScheme } = useMantineColorScheme();
  const stored = preferences?.theme as ThemePreference | undefined;
  useEffect(() => {
    if (stored) setColorScheme(TO_SCHEME[stored]);
  }, [stored, setColorScheme]);
}
