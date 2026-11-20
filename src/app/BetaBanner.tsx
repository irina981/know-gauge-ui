import { Alert, Anchor, Text } from '@mantine/core';
import { IconFlask } from '@tabler/icons-react';
import { useState } from 'react';
import { FEEDBACK_MAILTO } from '@/shared/siteLinks';

/** Bump the version to show the banner again to everyone who closed it (e.g. when the message changes). */
const DISMISSED_KEY = 'kg-beta-banner-dismissed';
const DISMISSED_VERSION = '1';

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === DISMISSED_VERSION;
  } catch {
    return false;
  }
}

/**
 * Slim beta notice above every page of the signed-in app. Closing it is remembered in this browser; the warning
 * about confidential documents matches the terms of use.
 */
export function BetaBanner() {
  const [dismissed, setDismissed] = useState(wasDismissed);
  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, DISMISSED_VERSION);
    } catch {
      // Private mode or blocked storage: it just shows again next time.
    }
  };

  return (
    <Alert
      variant="light"
      color="brand"
      radius="md"
      icon={<IconFlask size={18} />}
      withCloseButton
      closeButtonLabel="Close the beta notice"
      onClose={dismiss}
      mb="md"
      py={8}
    >
      <Text size="sm">
        KnowGauge is in public beta. Please don&rsquo;t upload confidential documents, and expect occasional
        changes.{' '}
        <Anchor href={FEEDBACK_MAILTO} size="sm" fw={600}>
          Send feedback
        </Anchor>
      </Text>
    </Alert>
  );
}
