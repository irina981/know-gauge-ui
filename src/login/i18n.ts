import { i18nBuilder } from 'keycloakify/login';
import type { ThemeName } from '../kc.gen';

/** Keycloak's messages (field errors, info texts) in the user's language. Our own copy is written in the pages. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ofTypeI18n only carries the I18n type
const { useI18n, ofTypeI18n } = i18nBuilder.withThemeName<ThemeName>().build();

type I18n = typeof ofTypeI18n;

export { useI18n, type I18n };
