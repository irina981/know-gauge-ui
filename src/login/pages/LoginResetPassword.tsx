import { Anchor, Button, Stack, Text, TextInput } from '@mantine/core';
import { IconMail } from '@tabler/icons-react';
import type { PageProps } from 'keycloakify/login/pages/PageProps';
import { useState } from 'react';
import type { I18n } from '../i18n';
import type { KcContext } from '../KcContext';

/** "Forgot password?" (login-reset-password.ftl): Keycloak emails a link to set a new password. */
export default function LoginResetPassword(
  props: PageProps<Extract<KcContext, { pageId: 'login-reset-password.ftl' }>, I18n>,
) {
  const { kcContext, i18n, Template, doUseDefaultCss, classes } = props;
  const { url, realm, auth, messagesPerField } = kcContext;
  const [submitting, setSubmitting] = useState(false);
  const error = messagesPerField.existsError('username') ? messagesPerField.get('username') : undefined;

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={doUseDefaultCss}
      classes={classes}
      documentTitle="Reset password · KnowGauge"
      displayMessage={!messagesPerField.existsError('username')}
      headerNode="Reset your password"
      infoNode={
        <>
          Remembered it? <Anchor href={url.loginUrl}>Back to sign in</Anchor>
        </>
      }
    >
      <form action={url.loginAction} method="post" onSubmit={() => setSubmitting(true)}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Enter the email address of your account and we’ll send you a link to set a new password.
          </Text>
          <TextInput
            name="username"
            label={realm.loginWithEmailAllowed ? 'Email' : 'Username'}
            type={realm.loginWithEmailAllowed ? 'email' : 'text'}
            autoComplete="username"
            defaultValue={auth.attemptedUsername ?? ''}
            autoFocus
            required
            error={error}
          />
          <Button
            type="submit"
            variant="gradient"
            size="md"
            fullWidth
            loading={submitting}
            leftSection={<IconMail size={18} />}
          >
            Send reset link
          </Button>
        </Stack>
      </form>
    </Template>
  );
}
