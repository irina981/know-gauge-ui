import type { KcContext } from './KcContext';

/** Where "Back to KnowGauge" leads: the UI's home page (the client's base URL in the realm). */
export function homeUrl(kcContext: KcContext): string | undefined {
  return (kcContext.client as { baseUrl?: string }).baseUrl;
}
