import { Box, Container, Group, Image, Text } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { Wordmark } from '@/shared/components';

/**
 * Frame for participants (ADR009): the brand only, no navigation into the admin app.
 * Participants reach these pages through a shared link (/t/…) or a personal invitation (/i/…).
 */
export function PublicLayout() {
  return (
    <Box mih="100vh" pb={96}>
      <Container size={880} py="lg">
        <Group gap="sm" mb="xl" wrap="nowrap">
          <Image src="/favicon.svg" alt="" w={36} h={36} />
          <Text fz="lg" lh={1.1}>
            <Wordmark />
          </Text>
        </Group>
        <Outlet />
      </Container>
    </Box>
  );
}
