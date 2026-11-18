import { Button, Stack, Text } from '@mantine/core';
import { IconLogout } from '@tabler/icons-react';
import type { PageProps } from 'keycloakify/login/pages/PageProps';
import type { I18n } from '../i18n';
import type { KcContext } from '../KcContext';

/** Asked when signing out is requested without a confirmed session (logout-confirm.ftl). */
export default function LogoutConfirm(
  props: PageProps<Extract<KcContext, { pageId: 'logout-confirm.ftl' }>, I18n>,
) {
  const { kcContext, i18n, Template, doUseDefaultCss, classes } = props;
  const { url, logoutConfirm } = kcContext;

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={doUseDefaultCss}
      classes={classes}
      documentTitle="Sign out · KnowGauge"
      headerNode="Sign out"
    >
      <form action={url.logoutConfirmAction} method="post">
        <Stack gap="md">
          <Text>Do you want to sign out of KnowGauge?</Text>
          <input type="hidden" name="session_code" value={logoutConfirm.code} />
          <Button
            type="submit"
            name="confirmLogout"
            value="Sign out"
            variant="gradient"
            size="md"
            fullWidth
            leftSection={<IconLogout size={18} />}
          >
            Sign out
          </Button>
        </Stack>
      </form>
    </Template>
  );
}
