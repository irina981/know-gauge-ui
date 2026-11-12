import {
  Badge,
  Box,
  Group,
  Image,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconBooks,
  IconChecklist,
  IconCloudUpload,
  IconFileSearch,
  IconHistory,
  IconLock,
  IconShieldCheck,
  IconSparkles,
  IconUserCheck,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { PageHeader } from '@/shared/components';

/** Short version of the pipeline, shown as chips in the hero. */
const PIPELINE = [
  { label: 'Retrieve passages', icon: IconFileSearch },
  { label: 'Write questions', icon: IconSparkles },
  { label: 'Verify answers', icon: IconShieldCheck },
  { label: 'You review', icon: IconUserCheck },
];

/** The steps from a document to a published test. Keep in sync with the backend pipeline. */
const STEPS = [
  {
    icon: IconCloudUpload,
    title: 'Organise and upload',
    text: 'Arrange your material in a topic tree and upload the PDFs that define what people should know.',
  },
  {
    icon: IconFileSearch,
    title: 'Index',
    text: 'Documents are split into passages and indexed, so the relevant parts can be retrieved for each test.',
  },
  {
    icon: IconSparkles,
    title: 'Generate',
    text: 'A language model writes questions, answers and explanations using only the retrieved passages.',
  },
  {
    icon: IconShieldCheck,
    title: 'Verify',
    text: 'A separate verification step checks every wrong answer and flags options that could also be correct.',
  },
  {
    icon: IconUserCheck,
    title: 'Review and publish',
    text: 'A reviewer accepts fixes, regenerates or edits questions, then publishes the test, which freezes it.',
  },
];

const PRINCIPLES = [
  {
    icon: IconBooks,
    color: 'brand',
    title: 'Grounded in your documentation',
    text: 'Questions are drawn only from the documents in your library, not from the open internet or a model’s general knowledge. Each question keeps a reference to the passages it was written from.',
  },
  {
    icon: IconShieldCheck,
    color: 'violet',
    title: 'Verified before review',
    text: 'Plausible but wrong answers are the hardest part of a good test. An independent check flags ambiguous options and suggests a clearer alternative.',
  },
  {
    icon: IconHistory,
    color: 'needle',
    title: 'People stay in control',
    text: 'Nothing is final until a reviewer approves it. Every change is versioned with its author and reason, and published tests can no longer be altered.',
  },
];

const USE_CASES = [
  'Employee onboarding and policy training',
  'Compliance and regulatory knowledge checks',
  'Technical and product knowledge assessments',
  'Certification and exam preparation',
];

/** One step of the pipeline as a translucent chip on the banner. */
function PipelineChip({ label, icon: Icon }: { label: string; icon: TablerIcon }) {
  return (
    <Badge
      size="lg"
      radius="xl"
      variant="outline"
      tt="none"
      fw={600}
      leftSection={<Icon size={14} />}
      style={{
        color: '#fff',
        background: 'rgba(255, 255, 255, 0.12)',
        borderColor: 'rgba(255, 255, 255, 0.22)',
      }}
    >
      {label}
    </Badge>
  );
}

/** What KnowGauge is for and how it works. */
export function AboutPage() {
  return (
    // A centred column reads better than the full window width for this text-heavy page.
    <Box maw={1200} mx="auto">
      <PageHeader
        eyebrow="About"
        title="KnowGauge"
        description="Reliable knowledge assessments, built from the documentation you already trust."
        media={<Image src="/favicon.svg" alt="KnowGauge logo" w={64} h={64} style={{ flexShrink: 0 }} />}
      />
      <Stack gap="xl">
        <Paper p={{ base: 'lg', sm: 'xl' }} className="kg-hero">
          <Group gap="xl" align="center" wrap="nowrap" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Group gap="xs" mb="xs">
                <IconShieldCheck size={18} color="var(--mantine-color-needle-3)" />
                <Text size="xs" fw={800} tt="uppercase" c="needle.3" style={{ letterSpacing: '0.12em' }}>
                  Grounded in your sources
                </Text>
              </Group>
              <Title order={2} c="white" fz={{ base: 24, sm: 30 }} lh={1.2}>
                Build reliable multiple-choice tests from your own documents
              </Title>
              <Text c="rgba(255,255,255,0.85)" mt="sm" maw={860}>
                KnowGauge turns an organisation’s own documents into multiple-choice assessments. It is
                AI-powered, but deliberately bounded: every question, answer and explanation is derived from
                the documentation you provide, every wrong answer is verified, and a reviewer approves the
                test before anyone takes it.
              </Text>
              {/* The pipeline at a glance; "How it works" below explains each step. */}
              <Group gap="xs" mt="lg">
                {PIPELINE.map(({ label, icon: Icon }, i) => (
                  <Group key={label} gap={6} wrap="nowrap">
                    <PipelineChip label={label} icon={Icon} />
                    {i < PIPELINE.length - 1 && <IconArrowRight size={14} color="rgba(255,255,255,0.6)" />}
                  </Group>
                ))}
              </Group>
            </div>
          </Group>
        </Paper>

        <div>
          <Title order={2} fz={20} mb={4}>
            How it works
          </Title>
          <Text c="dimmed" size="sm" mb="md">
            From a folder of documents to a published test in five steps.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="md">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <Paper key={title} p="md">
                <Group justify="space-between" mb="sm">
                  <ThemeIcon variant="gradient" size={40} radius="md">
                    <Icon size={22} stroke={1.6} />
                  </ThemeIcon>
                  <Text fw={800} c="dimmed" ff="heading">
                    {String(i + 1).padStart(2, '0')}
                  </Text>
                </Group>
                <Text fw={700} mb={4}>
                  {title}
                </Text>
                <Text size="sm" c="dimmed">
                  {text}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>
        </div>

        <div>
          <Title order={2} fz={20} mb={4}>
            Principles
          </Title>
          <Text c="dimmed" size="sm" mb="md">
            What you can rely on in every test KnowGauge produces.
          </Text>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            {PRINCIPLES.map(({ icon: Icon, color, title, text }) => (
              <Paper key={title} p="lg" className="kg-ai-edge" style={{ overflow: 'hidden' }}>
                <ThemeIcon variant="light" color={color} size={44} radius="md" mb="sm">
                  <Icon size={24} stroke={1.6} />
                </ThemeIcon>
                <Text fw={700} mb={6}>
                  {title}
                </Text>
                <Text size="sm" c="dimmed" lh={1.6}>
                  {text}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>
        </div>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Paper p="lg">
            <Group gap="sm" mb="sm">
              <ThemeIcon variant="light" size={36} radius="md">
                <IconChecklist size={20} />
              </ThemeIcon>
              <Text fw={700}>Where it fits</Text>
            </Group>
            <List spacing={6} size="sm" c="dimmed">
              {USE_CASES.map((useCase) => (
                <List.Item key={useCase}>{useCase}</List.Item>
              ))}
            </List>
          </Paper>
          <Paper p="lg">
            <Group gap="sm" mb="sm">
              <ThemeIcon variant="light" color="needle" size={36} radius="md">
                <IconLock size={20} />
              </ThemeIcon>
              <Text fw={700}>Your content stays the source of truth</Text>
            </Group>
            <Text size="sm" c="dimmed" lh={1.6}>
              The language model is used as a writing and checking tool, within the boundaries of your
              documentation. When your documents change, re-ingest them and generate a new test: the questions
              follow the material, not the other way round.
            </Text>
          </Paper>
        </SimpleGrid>
      </Stack>
    </Box>
  );
}
