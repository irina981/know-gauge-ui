/** Addresses separated by commas, semicolons, spaces or new lines. */
export function parseEmails(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

/** How many different addresses, ignoring case. */
export function countUnique(emails: string[]): number {
  return new Set(emails.map((e) => e.toLowerCase())).size;
}
