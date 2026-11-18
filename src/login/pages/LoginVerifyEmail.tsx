import { Anchor, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconMailCheck } from '@tabler/icons-react';
import type { PageProps } from 'keycloakify/login/pages/PageProps';
import type { I18n } from '../i18n';
import type { KcContext } from '../KcContext';

/** After registering (login-verify-email.ftl): the account is used once the email address is confirmed. */
export default function LoginVerifyEmail(
  props: PageProps<Extract<KcContext, { pageId: 'login-verify-email.ftl' }>, I18n>,
) {
  const { kcContext, i18n, Template, doUseDefaultCss, classes } = props;
  const { url, user } = kcContext;

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={doUseDefaultCss}
      classes={classes}
      documentTitle="Confirm your email · KnowGauge"
      // Keycloak's "You need to verify your email address" warning: this page already says it.
      displayMessage={false}
      headerNode="Check your inbox"
    >
      <Stack gap="md" align="flex-start">
        <ThemeIcon variant="light" color="needle" size={48} radius="md">
          <IconMailCheck size={26} stroke={1.6} />
        </ThemeIcon>
        <Text>
          We sent a confirmation link to {user?.email ? <b>{user.email}</b> : 'your email address'}. Open it
          to activate your account; you’ll be signed in to KnowGauge right away.
        </Text>
        <Text size="sm" c="dimmed">
          No email after a few minutes? Check your spam folder, or{' '}
          <Anchor href={url.loginAction}>send the link again</Anchor>.
        </Text>
      </Stack>
    </Template>
  );
}
