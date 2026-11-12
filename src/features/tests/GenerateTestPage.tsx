import {
  ActionIcon,
  Alert,
  Button,
  Collapse,
  Group,
  MultiSelect,
  NumberInput,
  Overlay,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import {
  IconChevronDown,
  IconChevronRight,
  IconInfoCircle,
  IconRestore,
  IconSparkles,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTopicDocuments } from '@/api/documents';
import { useGenerateTest } from '@/api/tests';
import { topicPathLabel, useTopicTree, type TopicTree } from '@/api/topics';
import type { DocumentDto, TestInput } from '@/api/types';
import { ANSWER_CARDINALITIES, COVERAGE_MODES, DIFFICULTIES, LANGUAGES } from '@/shared/enums';
import { PageHeader } from '@/shared/components';
import { formatDuration } from '@/shared/format';
import { useNow } from '@/shared/useNow';

/** "A", "A & B" or "A, B +3 more". */
function joinNames(names: string[]): string {
  if (names.length <= 2) return names.join(' & ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
}

/**
 * Default test name, e.g. "Core Java & Multithreading – Medium (10 questions)".
 * The backend requires a name but doesn't invent one; the user can overwrite this suggestion.
 */
function suggestTestName(v: FormValues, tree: TopicTree | undefined, docs: DocumentDto[]): string {
  const sourceNames =
    v.source === 'topics'
      ? v.topicIds.map((id) => tree?.byId.get(Number(id))?.name).filter((n): n is string => !!n)
      : v.documentIds
          .map((id) => docs.find((d) => String(d.id) === id))
          .map((d) => d?.title || d?.originalFileName)
          .filter((n): n is string => !!n);
  const source = sourceNames.length ? joinNames(sourceNames) : 'New test';
  const difficulty = DIFFICULTIES.find((d) => d.value === v.difficulty)?.label;
  const count = Number(v.questionCount);
  const details = [difficulty, count >= 1 ? `(${count} questions)` : undefined].filter(Boolean).join(' ');
  return details ? `${source} – ${details}` : source;
}

interface FormValues {
  name: string;
  description: string;
  source: 'topics' | 'documents';
  topicIds: string[];
  documentTopicId: string | null;
  documentIds: string[];
  questionCount: number | string;
  difficulty: string | null;
  answerCardinality: string | null;
  coverageMode: string | null;
  language: string | null;
  // advanced
  generationModel: string;
  promptTemplateId: string;
  temperature: number | string;
  maxOutputTokens: number | string;
  verificationModel: string;
}

/** Empty fields are left out, so the server applies its kg.testgen.defaults.* values. */
function toTestInput(v: FormValues): TestInput {
  const text = (s: string) => s.trim() || undefined;
  const num = (n: number | string) => (n === '' || n == null ? undefined : Number(n));

  const generationParams: Record<string, unknown> = {};
  if (num(v.temperature) != null) generationParams.temperature = num(v.temperature);
  if (num(v.maxOutputTokens) != null) generationParams.maxOutputTokens = num(v.maxOutputTokens);
  if (text(v.verificationModel)) generationParams.verificationModel = text(v.verificationModel);

  return {
    name: v.name.trim(),
    description: text(v.description),
    topicIds: v.source === 'topics' ? v.topicIds.map(Number) : undefined,
    documentIds: v.source === 'documents' ? v.documentIds.map(Number) : undefined,
    questionCount: num(v.questionCount),
    difficulty: v.difficulty ?? undefined,
    answerCardinality: v.answerCardinality ?? undefined,
    coverageMode: v.coverageMode ?? undefined,
    language: v.language ?? undefined,
    generationModel: text(v.generationModel),
    promptTemplateId: text(v.promptTemplateId),
    generationParams: Object.keys(generationParams).length ? generationParams : undefined,
  };
}

export function GenerateTestPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: tree } = useTopicTree();
  const generate = useGenerateTest();
  const [advancedOpen, { toggle: toggleAdvanced }] = useDisclosure(false);

  const presetTopic = searchParams.get('topicId');
  const form = useForm<FormValues>({
    initialValues: {
      name: '',
      description: '',
      source: 'topics',
      topicIds: presetTopic ? [presetTopic] : [],
      documentTopicId: presetTopic,
      documentIds: [],
      questionCount: 10,
      difficulty: 'MEDIUM',
      answerCardinality: 'SINGLE_CORRECT',
      coverageMode: 'BALANCED_PER_DOC_CHUNKS',
      language: 'EN',
      generationModel: '',
      promptTemplateId: '',
      temperature: '',
      maxOutputTokens: '',
      verificationModel: '',
    },
    validate: {
      name: (v) => (v.trim() ? null : 'Enter a name for the test'),
      topicIds: (v, values) =>
        values.source === 'topics' && v.length === 0 ? 'Pick at least one topic' : null,
      documentIds: (v, values) =>
        values.source === 'documents' && v.length === 0 ? 'Pick at least one document' : null,
      questionCount: (v) => (Number(v) >= 1 ? null : 'At least 1 question'),
    },
  });

  const topicOptions = useMemo(
    () =>
      tree
        ? [...tree.byId.values()]
            .map((t) => ({ value: String(t.id), label: topicPathLabel(tree, t.id) }))
            .sort((a, b) => a.label.localeCompare(b.label))
        : [],
    [tree],
  );

  // Documents of the chosen topic (first 100 is plenty for a picker).
  const docTopicId = form.values.documentTopicId ? Number(form.values.documentTopicId) : undefined;
  const { data: docs } = useTopicDocuments(docTopicId, 0, 100);
  const documentOptions = (docs?.content ?? []).map((d) => ({
    value: String(d.id),
    label: `${d.title || d.originalFileName}${d.status === 'INGESTED' ? '' : ` (${d.status?.toLowerCase() ?? 'not ingested'})`}`,
    disabled: d.status !== 'INGESTED',
  }));

  // Test name: suggested from the chosen source and settings until the user types their own.
  const [nameEdited, setNameEdited] = useState(false);
  const suggestedName = suggestTestName(form.values, tree, docs?.content ?? []);
  useEffect(() => {
    if (!nameEdited) form.setFieldValue('name', suggestedName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedName, nameEdited]);
  const useSuggestedName = () => {
    setNameEdited(false);
    form.setFieldValue('name', suggestedName);
  };

  // "Running for 2m 10s" while the request is pending.
  const now = useNow(generate.isPending);
  const elapsed = generate.isPending
    ? formatDuration(new Date(generate.submittedAt).toISOString(), new Date(now).toISOString())
    : '';

  // Errors are shown as a notification by the global handler.
  const submit = form.onSubmit((values) => {
    generate.mutate(toTestInput(values), { onSuccess: (test) => navigate(`/tests/${test.id}`) });
  });

  return (
    <>
      <PageHeader
        eyebrow="Assessments"
        title="Generate test"
        description="Choose the source material and the test settings. Only ingested documents are used."
        icon={IconSparkles}
      />
      <Stack maw={860} pos="relative" gap="lg">
        <Paper p="lg" pos="relative">
          {generate.isPending && (
            <Overlay blur={4} backgroundOpacity={0.35} radius="lg" center zIndex={5}>
              <Stack align="center" gap="xs" maw={460} px="md">
                <div className="kg-ai-ring" />
                <Text fw={800} size="lg" mt="sm" className="kg-gradient-text" ff="heading">
                  Writing your questions
                </Text>
                <Text fw={600}>{elapsed}</Text>
                <Text size="sm" c="dimmed" ta="center">
                  Retrieving passages, writing questions and verifying the answers can take several minutes.
                  The test keeps generating on the server if you leave this page.
                </Text>
                <Button variant="default" size="xs" mt="xs" onClick={() => navigate('/tests')}>
                  Continue in background
                </Button>
              </Stack>
            </Overlay>
          )}

          <form onSubmit={submit}>
            <Stack gap="md">
              <TextInput
                label="Test name"
                description={
                  nameEdited
                    ? 'Your own name. Use the button on the right to go back to the suggested one.'
                    : 'Suggested from the source and settings below. Type to use your own.'
                }
                withAsterisk
                maxLength={200}
                {...form.getInputProps('name')}
                onChange={(e) => {
                  form.setFieldValue('name', e.currentTarget.value);
                  setNameEdited(true);
                }}
                rightSection={
                  nameEdited && (
                    <Tooltip label="Use the suggested name">
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        onClick={useSuggestedName}
                        aria-label="Use the suggested name"
                      >
                        <IconRestore size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )
                }
              />
              <Textarea
                label="Description"
                description="Optional. For example who the test is for or which chapters it covers."
                autosize
                minRows={2}
                maxLength={2000}
                {...form.getInputProps('description')}
              />

              <div>
                <Text size="sm" fw={500} mb={4}>
                  Source
                </Text>
                <SegmentedControl
                  data={[
                    { value: 'topics', label: 'Topics' },
                    { value: 'documents', label: 'Specific documents' },
                  ]}
                  {...form.getInputProps('source')}
                />
              </div>

              {form.values.source === 'topics' ? (
                <MultiSelect
                  label="Topics"
                  description="Documents of the selected topics and all their sub-topics are used."
                  placeholder="Choose topics"
                  data={topicOptions}
                  searchable
                  clearable
                  {...form.getInputProps('topicIds')}
                />
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <Select
                    label="Topic"
                    placeholder="Choose a topic"
                    data={topicOptions}
                    searchable
                    {...form.getInputProps('documentTopicId')}
                    onChange={(v) => {
                      form.setFieldValue('documentTopicId', v);
                      form.setFieldValue('documentIds', []);
                    }}
                  />
                  <MultiSelect
                    label="Documents"
                    placeholder={docTopicId ? 'Choose documents' : 'Choose a topic first'}
                    data={documentOptions}
                    disabled={!docTopicId}
                    searchable
                    {...form.getInputProps('documentIds')}
                  />
                </SimpleGrid>
              )}

              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <NumberInput
                  label="Number of questions"
                  min={1}
                  max={50}
                  {...form.getInputProps('questionCount')}
                />
                <Select label="Difficulty" data={DIFFICULTIES} {...form.getInputProps('difficulty')} />
                <Select
                  label="Answers"
                  data={ANSWER_CARDINALITIES}
                  {...form.getInputProps('answerCardinality')}
                />
                <Select label="Language" data={LANGUAGES} {...form.getInputProps('language')} />
                <Select label="Coverage" data={COVERAGE_MODES} {...form.getInputProps('coverageMode')} />
              </SimpleGrid>

              <UnstyledButton onClick={toggleAdvanced}>
                <Group gap={4}>
                  {advancedOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                  <Text size="sm" fw={500}>
                    Advanced model settings
                  </Text>
                </Group>
              </UnstyledButton>
              <Collapse in={advancedOpen}>
                <Stack gap="sm">
                  <Alert variant="light" color="gray" icon={<IconInfoCircle size={18} />}>
                    Leave empty to use the server defaults.
                  </Alert>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <TextInput
                      label="Generation model"
                      placeholder="gpt-4.1"
                      {...form.getInputProps('generationModel')}
                    />
                    <TextInput
                      label="Verification model"
                      placeholder="server default"
                      {...form.getInputProps('verificationModel')}
                    />
                    <TextInput
                      label="Prompt template id"
                      placeholder="mcq-default"
                      {...form.getInputProps('promptTemplateId')}
                    />
                    <NumberInput
                      label="Temperature"
                      placeholder="server default"
                      min={0}
                      max={2}
                      step={0.1}
                      decimalScale={2}
                      {...form.getInputProps('temperature')}
                    />
                    <NumberInput
                      label="Max output tokens"
                      placeholder="server default"
                      min={1}
                      {...form.getInputProps('maxOutputTokens')}
                    />
                  </SimpleGrid>
                </Stack>
              </Collapse>

              <Group justify="flex-end">
                <Button
                  type="submit"
                  variant="gradient"
                  size="md"
                  leftSection={<IconSparkles size={18} />}
                  loading={generate.isPending}
                >
                  Generate test
                </Button>
              </Group>
            </Stack>
          </form>
        </Paper>
      </Stack>
    </>
  );
}
