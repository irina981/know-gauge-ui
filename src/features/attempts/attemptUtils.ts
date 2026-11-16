import { OPTION_LETTERS } from '@/shared/enums';

/** Badge/ring colour for a score: green from 80 %, yellow from 50 %, red below. */
export function scoreColor(percent?: number | null): string {
  if (percent == null) return 'gray';
  if (percent >= 80) return 'teal';
  if (percent >= 50) return 'yellow';
  return 'red';
}

/** "User 1" until real user accounts exist. */
export function userLabel(userId?: number | null): string {
  return userId == null ? 'Unknown user' : `User ${userId}`;
}

/** Option letters A–D present on a question, in order. */
export function optionLetters(options?: Record<string, string>): string[] {
  return OPTION_LETTERS.filter((l) => options?.[l] != null);
}
