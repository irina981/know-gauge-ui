/** Addresses outside the app, shared by the public home page footer and the signed-in app. */

export const SUPPORT_EMAIL = 'support@knowgauge.com';

/** The static landing page, which hosts the privacy policy and terms of use. */
export const LANDING_URL = 'https://knowgauge.com';
export const PRIVACY_URL = `${LANDING_URL}/privacy`;
export const TERMS_URL = `${LANDING_URL}/terms`;

/** Opens an email to support with the subject filled in. */
export const FEEDBACK_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('KnowGauge feedback')}`;
