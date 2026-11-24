import { Badge, Group, Tooltip } from '@mantine/core';
import { ROLES, roleLabel, sortRoles } from './roles';

/** A user's roles as badges; hovering one says what the role may do. */
export function RoleBadges({ roles }: { roles?: string[] }) {
  if (!roles?.length) return null;
  return (
    <Group gap={6} wrap="wrap">
      {sortRoles(roles).map((role) => (
        <Tooltip key={role} label={ROLES[role]?.description ?? role} multiline w={260} openDelay={300}>
          <Badge variant="light" color={ROLES[role]?.color ?? 'gray'} tt="none">
            {roleLabel(role)}
          </Badge>
        </Tooltip>
      ))}
    </Group>
  );
}
