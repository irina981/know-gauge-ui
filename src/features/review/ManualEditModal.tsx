import { Button, Checkbox, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect } from 'react';
import { useManualReplace } from '@/api/review';
import type { TestQuestionDto } from '@/api/types';
import { OPTION_LETTERS } from '@/shared/enums';

type Letter = (typeof OPTION_LETTERS)[number];

interface FormValues {
  questionText: string;
  options: Record<Letter, { text: string; correct: boolean }>;
  explanation: string;
  comment: string;
}

function initialValues(q: TestQuestionDto | null): FormValues {
  const options = {} as FormValues['options'];
  for (const l of OPTION_LETTERS) {
    const o = q?.options?.[l];
    // Start from the verifier's suggestion where there is one.
    options[l] = { text: o?.suggestedText || o?.text || '', correct: o?.correct ?? false };
  }
  return { questionText: q?.questionText ?? '', options, explanation: q?.explanation ?? '', comment: '' };
}

/** Replace a question with hand-written content. The server validates it and stores it as a new version. */
export function ManualEditModal({
  testId,
  question,
  multipleCorrect,
  onClose,
}: {
  testId: number;
  question: TestQuestionDto | null;
  multipleCorrect: boolean;
  onClose: () => void;
}) {
  const replace = useManualReplace(testId);
  const form = useForm<FormValues>({
    initialValues: initialValues(null),
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.questionText.trim()) errors.questionText = 'Question text is required';
      for (const l of OPTION_LETTERS) {
        if (!values.options[l].text.trim()) errors[`options.${l}.text`] = 'Option text is required';
      }
      const correctCount = OPTION_LETTERS.filter((l) => values.options[l].correct).length;
      if (correctCount === 0) errors.options = 'Mark at least one correct answer';
      else if (!multipleCorrect && correctCount > 1)
        errors.options = 'This test allows only one correct answer';
      return errors;
    },
  });

  useEffect(() => {
    if (question) form.setValues(initialValues(question));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question]);

  const setCorrect = (letter: Letter, checked: boolean) => {
    for (const l of OPTION_LETTERS) {
      if (l === letter) form.setFieldValue(`options.${l}.correct`, checked);
      else if (!multipleCorrect && checked) form.setFieldValue(`options.${l}.correct`, false);
    }
  };

  // Errors (e.g. the server's validation reasons) are shown as a notification; the dialog stays open.
  const submit = form.onSubmit((values) => {
    if (!question) return;
    replace.mutate(
      {
        questionId: question.id!,
        expectedCurrentVersionId: question.currentVersionId!,
        questionText: values.questionText.trim(),
        options: Object.fromEntries(
          OPTION_LETTERS.map((l) => [
            l,
            { text: values.options[l].text.trim(), correct: values.options[l].correct },
          ]),
        ),
        explanation: values.explanation.trim() || undefined,
        comment: values.comment.trim() || undefined,
      },
      { onSuccess: onClose },
    );
  });

  return (
    <Modal
      opened={question != null}
      onClose={onClose}
      title={question ? `Edit question ${(question.questionIndex ?? 0) + 1}` : ''}
      size="xl"
    >
      <form onSubmit={submit}>
        <Stack>
          <Textarea
            label="Question"
            autosize
            minRows={2}
            withAsterisk
            {...form.getInputProps('questionText')}
          />

          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Options{' '}
              <Text span size="xs" c="dimmed">
                — tick the {multipleCorrect ? 'correct answers' : 'correct answer'}
              </Text>
            </Text>
            {OPTION_LETTERS.map((l) => (
              <Group key={l} align="flex-start" wrap="nowrap">
                <Checkbox
                  mt={8}
                  color="teal"
                  aria-label={`Option ${l} is correct`}
                  checked={form.values.options[l].correct}
                  onChange={(e) => setCorrect(l, e.currentTarget.checked)}
                />
                <Text fw={600} mt={6} w={16}>
                  {l}
                </Text>
                <Textarea
                  autosize
                  minRows={1}
                  style={{ flex: 1 }}
                  {...form.getInputProps(`options.${l}.text`)}
                />
              </Group>
            ))}
            {form.errors.options && (
              <Text size="xs" c="red">
                {form.errors.options}
              </Text>
            )}
          </Stack>

          <Textarea label="Explanation" autosize minRows={2} {...form.getInputProps('explanation')} />
          <Textarea
            label="Comment (optional)"
            autosize
            minRows={1}
            maxLength={2000}
            {...form.getInputProps('comment')}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={replace.isPending}>
              Save as new version
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
