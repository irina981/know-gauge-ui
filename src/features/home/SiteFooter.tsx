import { Anchor, Box, Container, Group, Image, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconMail } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Wordmark } from '@/shared/components';

export const SUPPORT_EMAIL = 'support@knowgauge.com';

/** Sections of the About content the Product links jump to (ids set in AboutContent). */
const PRODUCT_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Quality control', href: '#quality' },
  { label: 'Full history', href: '#history' },
];

function ColumnTitle({ children }: { children: ReactNode }) {
  return (
    <Text size="xs" fw={800} tt="uppercase" mb="sm" style={{ letterSpacing: '0.12em' }}>
      {children}
    </Text>
  );
}

/**
 * Footer of the public home page, matching the static landing page (knowgauge.com). Not used inside the app.
 * `onSignIn` / `onSignUp` open the Keycloak pages.
 */
export function SiteFooter({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  return (
    <Box
      component="footer"
      style={{
        borderTop: '1px solid var(--mantine-color-default-border)',
        background: 'var(--mantine-color-body)',
      }}
    >
      <Container size={1200} pt={40} pb="lg">
        <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="xl">
          <Box maw={360}>
            <Group gap="sm" wrap="nowrap">
              <Image src="/favicon.svg" alt="" w={32} h={32} />
              <Text fz={20} lh={1.1}>
                <Wordmark />
              </Text>
            </Group>
            <Text size="sm" c="dimmed" mt="sm" lh={1.6}>
              AI-powered multiple-choice tests from your own documents, verified by a second AI and approved
              by people.
            </Text>
          </Box>
          <nav aria-label="Product">
            <ColumnTitle>Product</ColumnTitle>
            <Stack gap={8}>
              {PRODUCT_LINKS.map(({ label, href }) => (
                <Anchor key={href} href={href} size="sm" c="dimmed">
                  {label}
                </Anchor>
              ))}
            </Stack>
          </nav>
          <div>
            <ColumnTitle>Account</ColumnTitle>
            <Stack gap={8} align="flex-start">
              <Anchor component="button" type="button" size="sm" c="dimmed" onClick={onSignIn}>
                Sign in
              </Anchor>
              <Anchor component="button" type="button" size="sm" c="dimmed" onClick={onSignUp}>
                Create account
              </Anchor>
            </Stack>
          </div>
          <div>
            <ColumnTitle>Contact</ColumnTitle>
            <Anchor href={`mailto:${SUPPORT_EMAIL}`} size="sm" c="dimmed">
              <Group gap={6} wrap="nowrap" component="span">
                <IconMail size={16} />
                {SUPPORT_EMAIL}
              </Group>
            </Anchor>
          </div>
        </SimpleGrid>
        <Group
          justify="space-between"
          gap="xs"
          mt="xl"
          pt="md"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <Text size="xs" c="dimmed">
            © {new Date().getFullYear()} KnowGauge. All rights reserved.
          </Text>
          <Text size="xs" c="dimmed">
            Public beta
          </Text>
        </Group>
      </Container>
    </Box>
  );
}
