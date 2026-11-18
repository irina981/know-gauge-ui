import { Button, List, Stack, Text } from '@mantine/core';
import { kcSanitize } from 'keycloakify/lib/kcSanitize';
import type { PageProps } from 'keycloakify/login/pages/PageProps';
import type { I18n } from '../i18n';
import type { KcContext } from '../KcContext';
import { homeUrl } from '../homeUrl';

/** Keycloak's information page (info.ftl), e.g. "Your account has been updated" or "Your email was confirmed". */
export default function Info(props: PageProps<Extract<KcContext, { pageId: 'info.ftl' }>, I18n>) {
  const { kcContext, i18n, Template, doUseDefaultCss, classes } = props;
  const { message, messageHeader, requiredActions, skipLink, pageRedirectUri, actionUri } = kcContext;

  // Where to go next: back to the app, or on to the next step Keycloak asks for.
  const next = skipLink
    ? undefined
    : pageRedirectUri
      ? { href: pageRedirectUri, label: 'Continue to KnowGauge' }
      : actionUri
        ? { href: actionUri, label: 'Continue' }
        : homeUrl(kcContext)
          ? { href: homeUrl(kcContext)!, label: 'Back to KnowGauge' }
          : undefined;

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={doUseDefaultCss}
      classes={classes}
      documentTitle="KnowGauge"
      displayMessage={false}
      headerNode={messageHeader ? i18n.advancedMsgStr(messageHeader) : 'All set'}
    >
      <Stack gap="md">
        <Text>
          <span dangerouslySetInnerHTML={{ __html: kcSanitize(message.summary) }} />
        </Text>
        {requiredActions && requiredActions.length > 0 && (
          <List size="sm">
            {requiredActions.map((action) => (
              <List.Item key={action}>{i18n.advancedMsgStr(`requiredAction.${action}`)}</List.Item>
            ))}
          </List>
        )}
        {next && (
          <Button component="a" href={next.href} variant="gradient" size="md" fullWidth>
            {next.label}
          </Button>
        )}
      </Stack>
    </Template>
  );
}
