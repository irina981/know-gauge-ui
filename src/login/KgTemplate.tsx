import {
  Alert,
  Anchor,
  Box,
  Center,
  Container,
  Group,
  Image,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconX } from '@tabler/icons-react';
import { kcSanitize } from 'keycloakify/lib/kcSanitize';
import type { TemplateProps } from 'keycloakify/login/TemplateProps';
import { useEffect } from 'react';
import { Wordmark } from '@/shared/components';
import type { I18n } from './i18n';
import { homeUrl } from './homeUrl';
import type { KcContext } from './KcContext';

const MESSAGE_STYLE = {
  success: { color: 'green', icon: IconCircleCheck },
  info: { color: 'brand', icon: IconInfoCircle },
  warning: { color: 'yellow', icon: IconAlertTriangle },
  error: { color: 'red', icon: IconX },
} as const;

/**
 * The frame of every Keycloak page (sign in, register, passwords, messages) in the KnowGauge style: the logo above a
 * card, like the app's home page. Our own pages and Keycloakify's default pages (rarely shown ones) both use it.
 */
export default function KgTemplate(props: TemplateProps<KcContext, I18n>) {
  const {
    kcContext,
    children,
    headerNode,
    infoNode,
    socialProvidersNode,
    displayMessage = true,
    documentTitle,
  } = props;
  const { message, isAppInitiatedAction } = kcContext;

  useEffect(() => {
    document.title = documentTitle ?? 'Sign in · KnowGauge';
  }, [documentTitle]);

  // A warning about the action the app asked for (e.g. "update your password") is the page itself, not a message.
  const showMessage = displayMessage && message && !(message.type === 'warning' && isAppInitiatedAction);
  const style = message ? MESSAGE_STYLE[message.type] : undefined;
  const home = homeUrl(kcContext);

  return (
    <Center mih="100vh" py="xl">
      <Container size={460} w="100%">
        <Stack gap="lg">
          <Anchor href={home} underline="never" c="inherit" style={{ alignSelf: 'center' }}>
            <Group gap="sm" wrap="nowrap">
              <Image src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" w={44} h={44} />
              <div>
                <Text fz={26} lh={1.1}>
                  <Wordmark />
                </Text>
                <Text
                  size="xs"
                  c="dimmed"
                  fw={600}
                  lh={1.2}
                  tt="uppercase"
                  style={{ letterSpacing: '0.12em' }}
                >
                  Assessment studio
                </Text>
              </div>
            </Group>
          </Anchor>

          <Paper
            p={{ base: 'lg', sm: 'xl' }}
            className="kg-ai-edge kg-login-card"
            style={{ overflow: 'hidden' }}
          >
            <Stack gap="lg">
              <Title order={1} fz={24} lh={1.25}>
                {headerNode}
              </Title>
              {showMessage && message && style && (
                <Alert color={style.color} variant="light" icon={<style.icon size={18} />}>
                  <span dangerouslySetInnerHTML={{ __html: kcSanitize(message.summary) }} />
                </Alert>
              )}
              <Box>{children}</Box>
              {socialProvidersNode}
            </Stack>
          </Paper>

          {infoNode && (
            <Text ta="center" size="sm" c="dimmed">
              {infoNode}
            </Text>
          )}
          {home && (
            <Anchor href={home} size="sm" ta="center" c="dimmed">
              ← Back to KnowGauge
            </Anchor>
          )}
        </Stack>
      </Container>
    </Center>
  );
}
