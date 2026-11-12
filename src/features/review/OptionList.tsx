import { Badge, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle, IconArrowRight, IconCheck } from '@tabler/icons-react';
import type { TestQuestionOptionDto } from '@/api/types';
import { OPTION_LETTERS } from '@/shared/enums';

/** Options A–D of a question version. Correct answers get a green check; flagged options show the verifier's note. */
export function OptionList({ options }: { options?: Record<string, TestQuestionOptionDto> }) {
  return (
    <Stack gap={6}>
      {OPTION_LETTERS.filter((l) => options?.[l]).map((letter) => {
        const option = options![letter];
        return (
          <Paper
            key={letter}
            px="sm"
            py={8}
            radius="sm"
            style={{
              borderColor: option.flagged
                ? 'var(--mantine-color-orange-5)'
                : option.correct
                  ? 'var(--mantine-color-teal-5)'
                  : undefined,
              background: option.correct ? 'var(--mantine-color-teal-light)' : undefined,
            }}
          >
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <Badge
                variant={option.correct ? 'filled' : 'default'}
                color={option.correct ? 'teal' : 'gray'}
                w={28}
                px={0}
              >
                {letter}
              </Badge>
              <Text size="sm" style={{ flex: 1 }}>
                {option.text}
              </Text>
              {option.correct && (
                <ThemeIcon size="sm" color="teal" variant="transparent">
                  <IconCheck size={16} />
                </ThemeIcon>
              )}
            </Group>

            {option.flagged && (
              <Stack gap={4} mt={6} ml={40}>
                <Group gap={6} wrap="nowrap" align="flex-start">
                  <IconAlertTriangle
                    size={14}
                    color="var(--mantine-color-orange-6)"
                    style={{ marginTop: 3, flexShrink: 0 }}
                  />
                  <Text size="xs" c="orange.7">
                    {option.flagReason || 'Flagged by the verifier'}
                  </Text>
                </Group>
                {option.suggestedText && (
                  <Group gap={6} wrap="nowrap" align="flex-start">
                    <IconArrowRight size={14} style={{ marginTop: 3, flexShrink: 0 }} />
                    <Text size="xs">
                      <Text span size="xs" c="dimmed">
                        Suggested:{' '}
                      </Text>
                      {option.suggestedText}
                    </Text>
                  </Group>
                )}
              </Stack>
            )}
          </Paper>
        );
      })}
    </Stack>
  );
}
