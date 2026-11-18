import { Button, Checkbox, Group, PasswordInput, Stack, Text } from '@mantine/core';
import type { PageProps } from 'keycloakify/login/pages/PageProps';
import { useState } from 'react';
import type { I18n } from '../i18n';
import type { KcContext } from '../KcContext';

/** Set a new password (login-update-password.ftl): after a reset link, or when an admin requires it. */
export default function LoginUpdatePassword(
  props: PageProps<Extract<KcContext, { pageId: 'login-update-password.ftl' }>, I18n>,
) {
  const { kcContext, i18n, Template, doUseDefaultCss, classes } = props;
  const { url, messagesPerField, isAppInitiatedAction } = kcContext;
  const [submitting, setSubmitting] = useState(false);
  const errorOf = (field: string) =>
    messagesPerField.existsError(field) ? messagesPerField.get(field) : undefined;

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={doUseDefaultCss}
      classes={classes}
      documentTitle="New password · KnowGauge"
      displayMessage={!messagesPerField.existsError('password', 'password-confirm')}
      headerNode="Choose a new password"
    >
      <form action={url.loginAction} method="post" onSubmit={() => setSubmitting(true)}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Use at least 8 characters. A longer phrase is easier to remember and harder to guess.
          </Text>
          <PasswordInput
            name="password-new"
            label="New password"
            autoComplete="new-password"
            autoFocus
            required
            error={errorOf('password')}
          />
          <PasswordInput
            name="password-confirm"
            label="Confirm new password"
            autoComplete="new-password"
            required
            error={errorOf('password-confirm')}
          />
          <Checkbox name="logout-sessions" value="on" defaultChecked label="Sign out on my other devices" />
          <Group grow>
            {isAppInitiatedAction && (
              <Button type="submit" name="cancel-aia" value="true" variant="default" size="md" formNoValidate>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="gradient" size="md" loading={submitting}>
              Save password
            </Button>
          </Group>
        </Stack>
      </form>
    </Template>
  );
}
