import {
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
  IconBooks,
  IconCheck,
  IconChecklist,
  IconCloudUpload,
  IconDatabase,
  IconFileSearch,
  IconFlag,
  IconHistory,
  IconLock,
  IconShieldCheck,
  IconSparkles,
  IconUserCheck,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { PageHeader, Wordmark } from '@/shared/components';
import { Reveal } from '@/shared/Reveal';

/** The three main points under the hero headline. Keep in sync with the static landing page. */
const HERO_POINTS = [
  {
    icon: IconSparkles,
    title: 'AI-powered',
    text: 'Questions, answers and explanations written for you in minutes.',
  },
  {
    icon: IconBooks,
    title: 'From your own documents',
    text: 'Upload your PDFs and get multiple-choice tests built only from them.',
  },
  {
    icon: IconShieldCheck,
    title: 'Reliable and grounded',
    text: 'A second AI checks every wrong answer, and you approve every test.',
  },
];

/**
 * The steps from a document to a published test: the one flow shown on every page. Keep in sync with the backend
 * pipeline and the static landing page.
 */
const STEPS = [
  {
    icon: IconCloudUpload,
    title: 'Organise and upload',
    text: 'Arrange your material in a topic tree and upload the PDFs that define what people should know.',
  },
  {
    icon: IconDatabase,
    title: 'Index',
    text: 'Documents are split into passages and indexed, so the relevant parts can be retrieved for each test.',
  },
  {
    icon: IconFileSearch,
    title: 'Retrieve',
    text: 'For each test, passages are picked from the chosen topics: spread evenly across your documents, or the ones closest to a focus you describe.',
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

/** The two phases of STEPS: preparing the library once per document, then the same four steps for every test. */
const PHASES = [
  { tag: 'Once per document', title: 'Build your library', from: 0, to: 2, cols: { base: 1, sm: 2 } },
  {
    tag: 'For every test',
    title: 'Create, check and approve',
    from: 2,
    to: 6,
    cols: { base: 1, sm: 2, lg: 4 },
  },
];

/** One numbered step of "How it works". */
function StepCard({
  step: { icon: Icon, title, text },
  number,
}: {
  step: (typeof STEPS)[number];
  number: number;
}) {
  return (
    <Paper p="md" h="100%">
      <Group justify="space-between" mb="sm">
        <ThemeIcon variant="gradient" size={40} radius="md">
          <Icon size={22} stroke={1.6} />
        </ThemeIcon>
        <Text fw={800} c="dimmed" ff="heading">
          {String(number).padStart(2, '0')}
        </Text>
      </Group>
      <Text fw={700} mb={4}>
        {title}
      </Text>
      <Text size="sm" c="dimmed">
        {text}
      </Text>
    </Paper>
  );
}

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

const USE_CASES = [
  'Employee onboarding and policy training',
  'Compliance and regulatory knowledge checks',
  'Technical and product knowledge assessments',
  'Certification and exam preparation',
];

/** A photo across the top of a `p="lg"` card, cancelling the card's padding so it runs edge to edge. */
function CardPhoto({
  src,
  alt,
  position,
}: {
  src: string;
  alt: string;
  /** CSS object-position of the crop. */ position?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      h={200}
      fit="cover"
      style={position ? { objectPosition: position } : undefined}
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
export function AboutContent({
  heroAction,
  heroScreenshot = false,
}: {
  heroAction?: ReactNode;
  /** Show the app screenshot beside the hero text (the public home page; not inside the app). */
  heroScreenshot?: boolean;
}) {
  // The screenshots and their frames follow the light/dark theme.
  const dark = useComputedColorScheme('light') === 'dark';
  const shot = {
    hero: dark ? '/img/app-test-screen.png' : '/img/app-test-screen-light.png',
    heroPhone: dark ? '/img/app-question-phone.png' : '/img/app-question-phone-light.png',
    flagged: dark ? '/img/review-flagged.png' : '/img/review-flagged-light.png',
    bg: dark ? '#23262e' : '#ffffff',
    flagBg: dark ? '#2d2f38' : '#fefefe',
    bar: dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(16, 24, 64, 0.05)',
    dot: dark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(16, 24, 64, 0.18)',
  };
  return (
    <Stack gap="xl">
      <Paper p={{ base: 'lg', sm: 'xl' }} className="kg-hero">
        <Box style={{ position: 'relative', zIndex: 1 }}>
          {/* Text and screenshot side by side from md; stacked (text first) on narrower screens. */}
          <Flex
            gap="xl"
            direction={{ base: 'column', md: 'row' }}
            align={{ base: 'stretch', md: heroScreenshot ? 'stretch' : 'center' }}
          >
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <Group gap="xs" mb="xs">
                <IconSparkles size={18} color="var(--mantine-color-needle-3)" />
                <Text size="xs" fw={800} tt="uppercase" c="needle.3" style={{ letterSpacing: '0.12em' }}>
                  AI-powered · Grounded in your sources
                </Text>
              </Group>
              <Title order={2} c="white" fz={{ base: 26, sm: 34 }} lh={1.2}>
                Turn your documents into tests you can trust
              </Title>
              {/* Beside the screenshot the points share the height up to the button evenly. */}
              <Stack
                gap={20}
                mt={24}
                justify={heroScreenshot ? 'space-evenly' : undefined}
                style={heroScreenshot ? { flex: 1 } : undefined}
              >
                {HERO_POINTS.map(({ icon: Icon, title, text }) => (
                  <Group key={title} gap={14} wrap="nowrap" align="flex-start">
                    <ThemeIcon
                      size={40}
                      radius={10}
                      style={{
                        flexShrink: 0,
                        color: 'var(--mantine-color-needle-3)',
                        background: 'rgba(255, 255, 255, 0.12)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                      }}
                    >
                      <Icon size={20} />
                    </ThemeIcon>
                    <div>
                      <Text c="white" fw={700} fz={17}>
                        {title}
                      </Text>
                      <Text c="rgba(255,255,255,0.8)" fz={15} mt={2}>
                        {text}
                      </Text>
                    </div>
                  </Group>
                ))}
              </Stack>
              {heroAction && (
                // Pushed down so its bottom edge lines up with the screenshot's.
                <Box mt="auto" pt="xl">
                  {heroAction}
                </Box>
              )}
            </div>
            {/* The real app in a window-like frame. Narrower screens show a zoomed-in crop of the first
                question (kg-hero-shot in brand.css), as on the static landing page. */}
            {heroScreenshot && (
              <Box
                className="kg-hero-shot"
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
                <Group
                  gap={6}
                  px={12}
                  py={9}
                  aria-hidden
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    background: `linear-gradient(${shot.bar}, ${shot.bar}), ${shot.bg}`,
                  }}
                >
                  {[0, 1, 2].map((dot) => (
                    <Box key={dot} w={9} h={9} bg={shot.dot} style={{ borderRadius: '50%' }} />
                  ))}
                </Group>
                {/* Narrow screens: the first question as the app shows it on a phone. From md: the whole screen. */}
                <Image
                  className="kg-hero-shot-phone"
                  src={shot.heroPhone}
                  alt="A generated question in the KnowGauge app: the question, four options with the correct answer marked, and an explanation"
                  w="100%"
                  loading="lazy"
                />
                <Image
                  className="kg-hero-shot-wide"
                  src={shot.hero}
                  alt="The KnowGauge app showing a generated Information Security test: each question with its options, the correct answer marked and an explanation"
                  w="100%"
                  loading="lazy"
                />
              </Box>
            )}
          </Flex>
        </Box>
      </Paper>

      <div id="how-it-works">
        <SectionHeading
          title="How it works"
          sub="From a folder of documents to a published test in six steps: prepare your documents once, then create as many tests as you need."
        />
        {PHASES.map(({ tag, title, from, to, cols }, p) => (
          <div key={tag}>
            <Reveal>
              <Group gap={10} align="baseline" mt={p === 0 ? 0 : 24} mb="sm">
                <Text size="xs" fw={800} tt="uppercase" c="brand" style={{ letterSpacing: '0.12em' }}>
                  {tag}
                </Text>
                <Text fw={700}>{title}</Text>
              </Group>
            </Reveal>
            <SimpleGrid cols={cols} spacing="md">
              {STEPS.slice(from, to).map((step, i) => (
                <Reveal key={step.title} index={i} fill>
                  <StepCard step={step} number={from + i + 1} />
                </Reveal>
              ))}
            </SimpleGrid>
          </div>
        ))}
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

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Reveal index={0} fill>
          <Paper p="lg" h="100%" style={{ overflow: 'hidden' }}>
            {/* Photo: istockphoto.com, image 2252700261 (iStock standard licence) */}
            <CardPhoto
              src="/img/team-session.jpg"
              position="center 40%"
              alt="A small team in a bright meeting room listening to a colleague at the head of the table, with laptops and notes"
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
            {/* Photo: istockphoto.com, image 1088419382 (iStock standard licence) */}
            <CardPhoto
              src="/img/highlighting-document.jpg"
              position="center 60%"
              alt="A hand marking a line of a printed document with a yellow highlighter"
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
