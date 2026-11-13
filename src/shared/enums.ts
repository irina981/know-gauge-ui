/**
 * Labels and badge colours for backend enum values, kept in one place.
 * Enum values arrive from the API as plain strings (e.g. "REQUIRES_REVIEW").
 */

export interface EnumInfo {
  label: string;
  color: string;
}

function lookup(map: Record<string, EnumInfo>, value: string | undefined | null): EnumInfo {
  if (!value) return { label: '—', color: 'gray' };
  return map[value] ?? { label: humanize(value), color: 'gray' };
}

/** "REQUIRES_REVIEW" -> "Requires review" */
export function humanize(value: string): string {
  const text = value.toLowerCase().replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const TEST_STATUSES: Record<string, EnumInfo> = {
  // A test stays CREATED while its generation is running on the server.
  CREATED: { label: 'Generating', color: 'cyan' },
  GENERATED: { label: 'Generated', color: 'blue' },
  REQUIRES_REVIEW: { label: 'Needs review', color: 'orange' },
  REVIEWED: { label: 'Reviewed', color: 'teal' },
  FAILED: { label: 'Failed', color: 'red' },
  // Frozen: no review actions; the only status that accepts attempts (backend ADR005).
  PUBLISHED: { label: 'Published', color: 'violet' },
};
export const testStatus = (v?: string | null) => lookup(TEST_STATUSES, v);

/** Review actions are only allowed in these test states. */
export const REVIEWABLE_TEST_STATUSES = ['GENERATED', 'REQUIRES_REVIEW', 'REVIEWED'];

/** A test can be published from these states, and only when no question needs review. */
export const PUBLISHABLE_TEST_STATUSES = ['GENERATED', 'REVIEWED'];

export const DOCUMENT_STATUSES: Record<string, EnumInfo> = {
  UPLOADED: { label: 'Uploaded', color: 'gray' },
  INGESTING: { label: 'Ingesting', color: 'blue' },
  INGESTED: { label: 'Ingested', color: 'teal' },
  FAILED: { label: 'Failed', color: 'red' },
};
export const documentStatus = (v?: string | null) => lookup(DOCUMENT_STATUSES, v);

export const QUESTION_STATUSES: Record<string, EnumInfo> = {
  OK: { label: 'OK', color: 'teal' },
  NEEDS_REVIEW: { label: 'Needs review', color: 'orange' },
};
export const questionStatus = (v?: string | null) => lookup(QUESTION_STATUSES, v);

export const VERSION_ORIGINS: Record<string, EnumInfo> = {
  GENERATED: { label: 'Generated', color: 'blue' },
  REGENERATED: { label: 'Regenerated', color: 'grape' },
  FIX_ACCEPTED: { label: 'Fix accepted', color: 'teal' },
  MANUAL: { label: 'Manual', color: 'indigo' },
  FLAGS_DISMISSED: { label: 'Kept as is', color: 'gray' },
};
export const versionOrigin = (v?: string | null) => lookup(VERSION_ORIGINS, v);

export const EVENT_TYPES: Record<string, EnumInfo> = {
  TEST_CREATED: { label: 'Test created', color: 'gray' },
  TEST_GENERATED: { label: 'Test generated', color: 'blue' },
  TEST_REQUIRES_REVIEW: { label: 'Test needs review', color: 'orange' },
  TEST_REVIEWED: { label: 'Test reviewed', color: 'teal' },
  TEST_FAILED: { label: 'Test failed', color: 'red' },
  TEST_PUBLISHED: { label: 'Test published', color: 'violet' },
  TEST_UNPUBLISHED: { label: 'Test unpublished', color: 'gray' },
  QUESTION_GENERATED: { label: 'Question generated', color: 'blue' },
  OPTION_FLAGGED: { label: 'Option flagged', color: 'orange' },
  FIX_ACCEPTED: { label: 'Fix accepted', color: 'teal' },
  QUESTION_REGENERATED: { label: 'Question regenerated', color: 'grape' },
  REGENERATION_FAILED: { label: 'Regeneration failed', color: 'red' },
  QUESTION_MANUALLY_REPLACED: { label: 'Manually replaced', color: 'indigo' },
  FLAGS_DISMISSED: { label: 'Kept as is (flags dismissed)', color: 'gray' },
};
export const eventType = (v?: string | null) => lookup(EVENT_TYPES, v);

export const RUN_STATUSES: Record<string, EnumInfo> = {
  SUCCESS: { label: 'Success', color: 'teal' },
  FAILED: { label: 'Failed', color: 'red' },
};
export const runStatus = (v?: string | null) => lookup(RUN_STATUSES, v);

/** Options for the "Generate test" form. */
export const DIFFICULTIES = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];

export const ANSWER_CARDINALITIES = [
  { value: 'SINGLE_CORRECT', label: 'Single correct answer' },
  { value: 'MULTIPLE_CORRECT', label: 'Multiple correct answers' },
];

// FOCUSED exists in the backend but is not implemented yet.
export const COVERAGE_MODES = [
  { value: 'BALANCED_PER_DOC_CHUNKS', label: 'Balanced across document chunks' },
  { value: 'BALANCED_PER_DOCS', label: 'Balanced across documents' },
];

export const LANGUAGES = [
  { value: 'EN', label: 'English' },
  { value: 'DE', label: 'German' },
  { value: 'FR', label: 'French' },
  { value: 'ES', label: 'Spanish' },
  { value: 'IT', label: 'Italian' },
  { value: 'SR', label: 'Serbian' },
];

export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;
