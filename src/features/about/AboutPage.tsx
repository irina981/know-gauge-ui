import {
  Badge,
  Box,
  Flex,
  Group,
  Image,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Timeline,
  Title,
  useComputedColorScheme,
} from '@mantine/core';
import {
  IconArrowRight,
  IconBooks,
  IconCheck,
  IconChecklist,
  IconCloudUpload,
  IconFileSearch,
  IconFlag,
  IconHistory,
  IconLock,
  IconShieldCheck,
  IconSparkles,
  IconUserCheck,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { PageHeader, Wordmark } from '@/shared/components';
import { Reveal } from '@/shared/Reveal';

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

/** The three quality-control layers: generator, verifier, reviewer. Keep in sync with the static landing page. */
const QUALITY_LAYERS = [
  {
    icon: IconSparkles,
    color: 'gradient',
    title: 'AI generator',
    text: 'Writes each question, its answers and an explanation from passages retrieved from your documents, never from general knowledge.',
    checks: ['Grounded in your sources', 'Rule checks before and after the AI runs'],
  },
  {
    icon: IconShieldCheck,
    color: 'violet',
    title: 'AI verifier',
    text: 'A separate model checks every wrong answer against the same passages. If an option could also be correct, it flags it, explains why and suggests a clearer one.',
    checks: ['Every wrong answer checked', 'Flags with a reason and a suggested fix'],
  },
  {
    icon: IconUserCheck,
    color: 'needle',
    title: 'Your review',
    text: 'Flagged questions wait for you. Accept the suggested fix, regenerate the question, write your own, or keep it as it is with a comment.',
    checks: ['Your attention goes where it is needed', 'Nothing is published without your approval'],
  },
];

/** An illustrative history of one question. Keep in sync with the static landing page. */
const EXAMPLE_HISTORY = [
  {
    icon: IconSparkles,
    color: 'gradient',
    title: 'Question generated · version 1',
    text: 'AI model, prompt, source passages and response saved',
  },
  {
    icon: IconFlag,
    color: 'violet',
    title: 'Option C flagged',
    text: 'Verifier: “C could also be correct according to the second passage”',
  },
  {
    icon: IconUserCheck,
    color: 'needle',
    title: 'Suggested fix accepted · version 2',
    text: 'By the reviewer; version 1 is kept, unchanged',
  },
  {
    icon: IconLock,
    color: 'brand',
    title: 'Test published',
    text: 'Frozen: the questions can no longer change',
  },
];

/** What the audit trail records. Keep in sync with the static landing page. */
const RECORDED = [
  {
    label: 'Every AI call:',
    text: 'the model, the prompt, the passages it was given, its full response and the tokens used.',
  },
  {
    label: 'Every version of every question:',
    text: 'a change creates a new version and never overwrites the old one.',
  },
  {
    label: 'Every decision:',
    text: 'who accepted, regenerated, replaced or kept a question, when, and their comment.',
  },
  {
    label: 'Every source:',
    text: 'each question keeps a reference to the passages it was written from.',
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

/** A photo across the top of a `p="lg"` card, cancelling the card's padding so it runs edge to edge. */
function CardPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      h={200}
      fit="cover"
      loading="lazy"
      mt="calc(var(--mantine-spacing-lg) * -1)"
      mx="calc(var(--mantine-spacing-lg) * -1)"
      mb="md"
      w="calc(100% + 2 * var(--mantine-spacing-lg))"
      maw="none"
    />
  );
}

/** A section's title and one-line summary, fading in together on scroll. */
function SectionHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <Reveal>
      <Title order={2} fz={20} mb={4}>
        {title}
      </Title>
      <Text c="dimmed" size="sm" mb="md">
        {sub}
      </Text>
    </Reveal>
  );
}

/** The About page inside the app. */
export function AboutPage() {
  return (
    // A limited width reads better for this text-heavy page; left-aligned like the other pages.
    <Box maw={1200}>
      <PageHeader
        eyebrow="About"
        title={<Wordmark font="inherit" />}
        description="Reliable knowledge assessments, built from the documentation you already trust."
        media={
          <Image
            src="/favicon.svg"
            alt="KnowGauge logo"
            w={40}
            h={40}
            visibleFrom="xs"
            style={{ flexShrink: 0 }}
          />
        }
      />
      <AboutContent />
    </Box>
  );
}

/**
 * What KnowGauge is for and how it works. Shown on the About page and on the public home page, so both always say
 * the same. `heroAction` is placed under the pipeline in the hero (the home page's sign-up button).
 */
export function AboutContent({ heroAction }: { heroAction?: ReactNode }) {
  // The screenshots and their frames follow the light/dark theme.
  const dark = useComputedColorScheme('light') === 'dark';
  const shot = {
    hero: dark ? '/img/app-test-screen.png' : '/img/app-test-screen-light.png',
    flagged: dark ? '/img/review-flagged.png' : '/img/review-flagged-light.png',
    bg: dark ? '#23262e' : '#ffffff',
    flagBg: dark ? '#2d2f38' : '#fefefe',
    bar: dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(16, 24, 64, 0.05)',
    dot: dark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(16, 24, 64, 0.18)',
  };
  return (
    <Stack gap="xl">
      <Paper p={{ base: 'lg', sm: 'xl' }} className="kg-hero">
        <Group gap="xl" align="center" wrap="nowrap" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Group gap="xs" mb="xs">
              <IconSparkles size={18} color="var(--mantine-color-needle-3)" />
              <Text size="xs" fw={800} tt="uppercase" c="needle.3" style={{ letterSpacing: '0.12em' }}>
                AI-powered · Grounded in your sources
              </Text>
            </Group>
            <Title order={2} c="white" fz={{ base: 24, sm: 30 }} lh={1.2}>
              Build reliable, AI-powered multiple-choice tests from your own documents
            </Title>
            <Text c="rgba(255,255,255,0.85)" mt="sm" maw={860}>
              KnowGauge is an AI-powered assessment studio that turns an organisation’s own documents into
              multiple-choice tests. The AI is deliberately bounded: every question, answer and explanation is
              derived from the documentation you provide, every wrong answer is verified, and a reviewer
              approves the test before anyone takes it.
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
            {heroAction && <Box mt="xl">{heroAction}</Box>}
          </div>
          {/* The real app in a window-like frame. Wide screens only; too small to read on phones. */}
          <Box
            visibleFrom="md"
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 12,
              overflow: 'hidden',
              background: shot.bg,
              border: '1px solid rgba(255, 255, 255, 0.18)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.3)',
            }}
          >
            <Group gap={6} px={12} py={9} bg={shot.bar} aria-hidden>
              {[0, 1, 2].map((dot) => (
                <Box key={dot} w={9} h={9} bg={shot.dot} style={{ borderRadius: '50%' }} />
              ))}
            </Group>
            <Image
              src={shot.hero}
              alt="The KnowGauge app showing a generated Information Security test: each question with its options, the correct answer marked and an explanation"
              w="100%"
            />
          </Box>
        </Group>
      </Paper>

      <div id="how-it-works">
        <SectionHeading
          title="How it works"
          sub="From a folder of documents to a published test in five steps."
        />
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="md">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} index={i} fill>
              <Paper p="md" h="100%">
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
            </Reveal>
          ))}
        </SimpleGrid>
      </div>

      <div id="quality">
        <SectionHeading
          title="Quality control in three layers"
          sub="One AI writes, a second AI checks, and a person decides wherever there is doubt."
        />
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          {QUALITY_LAYERS.map(({ icon: Icon, color, title, text, checks }, i) => (
            <Reveal key={title} index={i} fill>
              <Paper p="lg" h="100%" className="kg-ai-edge" style={{ overflow: 'hidden' }}>
                <ThemeIcon
                  variant={color === 'gradient' ? 'gradient' : 'light'}
                  color={color === 'gradient' ? undefined : color}
                  size={44}
                  radius="md"
                  mb="sm"
                >
                  <Icon size={24} stroke={1.6} />
                </ThemeIcon>
                <Text size="xs" fw={800} tt="uppercase" c="dimmed" mb={4} style={{ letterSpacing: '0.12em' }}>
                  Layer {i + 1}
                </Text>
                <Text fw={700} mb={6}>
                  {title}
                </Text>
                <Text size="sm" c="dimmed" lh={1.6}>
                  {text}
                </Text>
                <List
                  mt="md"
                  spacing={6}
                  size="sm"
                  c="dimmed"
                  icon={
                    <IconCheck
                      size={16}
                      color="var(--mantine-primary-color-filled)"
                      style={{ marginTop: 3 }}
                    />
                  }
                  styles={{ itemWrapper: { alignItems: 'flex-start' } }}
                >
                  {checks.map((check) => (
                    <List.Item key={check}>{check}</List.Item>
                  ))}
                </List>
              </Paper>
            </Reveal>
          ))}
        </SimpleGrid>
        <Reveal>
          {/* A real flagged question from the review screen, with its explanation beside it (below on phones). */}
          <Paper mt="md" style={{ overflow: 'hidden' }}>
            <Flex direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }}>
              <Flex
                align="center"
                justify="center"
                w={{ base: '100%', md: 500 }}
                style={{
                  flexShrink: 0,
                  maxWidth: '100%',
                  alignSelf: 'stretch',
                  background: shot.flagBg,
                  padding: 16,
                  borderRight: '1px solid var(--mantine-color-default-border)',
                }}
              >
                <Image
                  src={shot.flagged}
                  w="100%"
                  maw={468}
                  loading="lazy"
                  alt="A question in the KnowGauge review screen. Option B, marked as wrong, is also consistent with the guidance; the verifier flags it with a quote from the source and suggests a clearly wrong replacement. Buttons offer Accept fix, Keep as is, Regenerate and Edit."
                />
              </Flex>
              <Box p="lg" style={{ flex: 1, minWidth: 0 }}>
                <ThemeIcon variant="light" color="violet" size={36} radius="md" mb="sm">
                  <IconFlag size={20} />
                </ThemeIcon>
                <Text fw={700} mb={6}>
                  What a flag looks like
                </Text>
                <Text size="sm" c="dimmed" lh={1.6}>
                  Here wrong answer B is just as consistent with the guidance as the correct answer A. The
                  verifier quotes the source, explains why B is also correct and suggests a clearly wrong
                  replacement. A flag never changes the answer key on its own; you decide with{' '}
                  <b>Accept fix</b>, <b>Keep as is</b>, <b>Regenerate</b> or <b>Edit</b>.
                </Text>
              </Box>
            </Flex>
          </Paper>
        </Reveal>
      </div>

      <div id="history">
        <SectionHeading
          title="Every step on the record"
          sub="See exactly how each question was made, and every change since."
        />
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Reveal index={0} fill>
            <Paper p="lg" h="100%" className="kg-ai-edge" style={{ overflow: 'hidden' }}>
              <Text size="xs" fw={700} c="dimmed" mb="md">
                Example: the history of one question
              </Text>
              <Timeline bulletSize={36} lineWidth={2}>
                {EXAMPLE_HISTORY.map(({ icon: Icon, color, title, text }) => (
                  <Timeline.Item
                    key={title}
                    bullet={
                      <ThemeIcon
                        variant={color === 'gradient' ? 'gradient' : 'light'}
                        color={color === 'gradient' ? undefined : color}
                        size={36}
                        radius="xl"
                      >
                        <Icon size={18} />
                      </ThemeIcon>
                    }
                    title={
                      <Text fw={700} fz={15}>
                        {title}
                      </Text>
                    }
                  >
                    <Text size="sm" c="dimmed">
                      {text}
                    </Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            </Paper>
          </Reveal>
          <Reveal index={1} fill>
            <Paper p="lg" h="100%">
              <Group gap="sm" mb="sm">
                <ThemeIcon variant="light" color="needle" size={36} radius="md">
                  <IconHistory size={20} />
                </ThemeIcon>
                <Text fw={700}>What KnowGauge records</Text>
              </Group>
              <List
                spacing={6}
                size="sm"
                c="dimmed"
                icon={
                  <IconCheck size={16} color="var(--mantine-primary-color-filled)" style={{ marginTop: 3 }} />
                }
                styles={{ itemWrapper: { alignItems: 'flex-start' } }}
              >
                {RECORDED.map(({ label, text }) => (
                  <List.Item key={label}>
                    <Text span fw={700} c="var(--mantine-color-text)">
                      {label}
                    </Text>{' '}
                    {text}
                  </List.Item>
                ))}
              </List>
              <Text size="sm" c="dimmed" mt="md">
                When someone asks “where did this question come from?”, the answer is in the review screen.
              </Text>
            </Paper>
          </Reveal>
        </SimpleGrid>
      </div>

      <div>
        <SectionHeading title="Principles" sub="What you can rely on in every test KnowGauge produces." />
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          {PRINCIPLES.map(({ icon: Icon, color, title, text }, i) => (
            <Reveal key={title} index={i} fill>
              <Paper p="lg" h="100%" className="kg-ai-edge" style={{ overflow: 'hidden' }}>
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
            </Reveal>
          ))}
        </SimpleGrid>
      </div>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Reveal index={0} fill>
          <Paper p="lg" h="100%" style={{ overflow: 'hidden' }}>
            {/* Photo: unsplash.com/photos/IESB4iFVuzA (Unsplash licence) */}
            <CardPhoto
              src="/img/onboarding-welcome.jpg"
              alt="A smiling colleague shaking hands with a new team member"
            />
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
        </Reveal>
        <Reveal index={1} fill>
          <Paper p="lg" h="100%" style={{ overflow: 'hidden' }}>
            {/* Photo: unsplash.com/photos/yKnIbJV0RbY (Unsplash licence) */}
            <CardPhoto
              src="/img/review-checklist.jpg"
              alt="A hand ticking off items on a checklist with a stylus"
            />
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
        </Reveal>
      </SimpleGrid>
    </Stack>
  );
}
