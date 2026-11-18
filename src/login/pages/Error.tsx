import { Button, Stack, Text } from '@mantine/core';
import { kcSanitize } from 'keycloakify/lib/kcSanitize';
import type { PageProps } from 'keycloakify/login/pages/PageProps';
import type { I18n } from '../i18n';
import type { KcContext } from '../KcContext';
import { homeUrl } from '../homeUrl';

/** Keycloak's error page (error.ftl), e.g. an expired or already used link. */
export default function ErrorPage(props: PageProps<Extract<KcContext, { pageId: 'error.ftl' }>, I18n>) {
  const { kcContext, i18n, Template, doUseDefaultCss, classes } = props;
  const { message, skipLink } = kcContext;
  const home = homeUrl(kcContext);

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={doUseDefaultCss}
      classes={classes}
      documentTitle="Something went wrong · KnowGauge"
      displayMessage={false}
      headerNode="Something went wrong"
    >
      <Stack gap="md">
        <Text>
          <span dangerouslySetInnerHTML={{ __html: kcSanitize(message.summary) }} />
        </Text>
        {!skipLink && home && (
          <Button component="a" href={home} variant="gradient" size="md" fullWidth>
            Back to KnowGauge
          </Button>
        )}
      </Stack>
    </Template>
  );
}
