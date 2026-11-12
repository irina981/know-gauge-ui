import {
  Alert,
  Badge,
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
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import {
  IconArrowRight,
  IconChevronDown,
  IconChevronRight,
  IconFileSearch,
  IconInfoCircle,
  IconShieldCheck,
  IconSparkles,
  IconUserCheck,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTopicDocuments } from '@/api/documents';
import { useGenerateTest } from '@/api/tests';
import { topicPathLabel, useTopicTree } from '@/api/topics';
import type { TestInput } from '@/api/types';
import { ANSWER_CARDINALITIES, COVERAGE_MODES, DIFFICULTIES, LANGUAGES } from '@/shared/enums';
import { formatDuration } from '@/shared/format';
import { useNow } from '@/shared/useNow';

/** The steps shown in the hero banner, matching the backend's generation pipeline. */
const PIPELINE = [
  { label: 'Retrieve passages', icon: IconFileSearch },
  { label: 'Write questions', icon: IconSparkles },
  { label: 'Verify answers', icon: IconShieldCheck },
  { label: 'You review', icon: IconUserCheck },
];

interface FormValues {
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
    <Stack maw={860} pos="relative" gap="lg">
      {/* Hero: what happens to your documents. */}
      <Paper p={{ base: 'lg', sm: 'xl' }} className="kg-hero">
        <Group gap="xs" mb="xs">
          <IconShieldCheck size={18} color="var(--mantine-color-needle-3)" />
          <Text size="xs" fw={800} tt="uppercase" c="needle.3" style={{ letterSpacing: '0.12em' }}>
            Grounded in your sources
          </Text>
        </Group>
        <Title order={1} c="white" fz={{ base: 24, sm: 30 }} lh={1.2} maw={600}>
          Build reliable multiple-choice tests from your own documents
        </Title>
        <Text c="rgba(255,255,255,0.8)" size="sm" mt="xs" maw={600}>
          Every question is written from passages of your ingested documents, and every wrong answer is
          verified before it reaches you for review.
        </Text>
        <Group gap="xs" mt="lg" style={{ position: 'relative', zIndex: 1 }}>
          {PIPELINE.map(({ label, icon: Icon }, i) => (
            <Group key={label} gap={6} wrap="nowrap">
              <Badge
                size="lg"
                radius="xl"
                variant="outline"
                tt="none"
                fw={600}
                leftSection={<Icon size={14} />}
                // Translucent chips, so the banner stays calm.
                style={{
                  color: '#fff',
                  background: 'rgba(255, 255, 255, 0.12)',
                  borderColor: 'rgba(255, 255, 255, 0.22)',
                }}
              >
                {label}
              </Badge>
              {i < PIPELINE.length - 1 && <IconArrowRight size={14} color="rgba(255,255,255,0.6)" />}
            </Group>
          ))}
        </Group>
      </Paper>

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
                Retrieving passages, writing questions and verifying the answers can take several minutes. The
                test keeps generating on the server if you leave this page.
              </Text>
              <Button variant="default" size="xs" mt="xs" onClick={() => navigate('/tests')}>
                Continue in background
              </Button>
            </Stack>
          </Overlay>
        )}

        <form onSubmit={submit}>
          <Stack gap="md">
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
  );
}
