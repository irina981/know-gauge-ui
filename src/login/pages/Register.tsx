import { Anchor, Button, Checkbox, PasswordInput, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { IconUserPlus } from '@tabler/icons-react';
import type { Attribute } from 'keycloakify/login';
import type { PageProps } from 'keycloakify/login/pages/PageProps';
import { useState } from 'react';
import type { I18n } from '../i18n';
import type { KcContext } from '../KcContext';

/** Our own wording for Keycloak's standard profile attributes; others use the label from the realm. */
const LABELS: Record<string, string> = {
  username: 'Username',
  email: 'Email',
  firstName: 'First name',
  lastName: 'Last name',
};

const AUTOCOMPLETE: Record<string, string> = {
  username: 'username',
  email: 'email',
  firstName: 'given-name',
  lastName: 'family-name',
};

/**
 * Keycloak's registration form (register.ftl). The fields come from the realm's user profile (email, first and last
 * name by default); their names and the form action are Keycloak's, so its validation and errors apply.
 */
export default function Register(props: PageProps<Extract<KcContext, { pageId: 'register.ftl' }>, I18n>) {
  const { kcContext, i18n, Template, doUseDefaultCss, classes } = props;
  const { url, profile, passwordRequired, messagesPerField, termsAcceptanceRequired } = kcContext;
  const [submitting, setSubmitting] = useState(false);

  const errorOf = (field: string) =>
    messagesPerField.existsError(field) ? messagesPerField.get(field) : undefined;
  const labelOf = (attribute: Attribute) =>
    LABELS[attribute.name] ?? i18n.advancedMsgStr(attribute.displayName ?? attribute.name);
  const attributes = Object.values(profile.attributesByName).filter(
    (attribute) =>
      attribute.annotations.inputType !== 'hidden' &&
      // The realm uses the email as the username: no separate username field.
      !(attribute.name === 'username' && kcContext.realm.registrationEmailAsUsername),
  );
  const nameFields = attributes.filter((a) => a.name === 'firstName' || a.name === 'lastName');
  const otherFields = attributes.filter((a) => a.name !== 'firstName' && a.name !== 'lastName');

  const field = (attribute: Attribute) => (
    <TextInput
      key={attribute.name}
      name={attribute.name}
      label={labelOf(attribute)}
      type={attribute.name === 'email' ? 'email' : 'text'}
      autoComplete={AUTOCOMPLETE[attribute.name] ?? attribute.autocomplete}
      defaultValue={attribute.value ?? ''}
      required={attribute.required}
      readOnly={attribute.readOnly}
      error={errorOf(attribute.name)}
    />
  );

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={doUseDefaultCss}
      classes={classes}
      documentTitle="Create account · KnowGauge"
      headerNode="Create your account"
      infoNode={
        <>
          Already have an account? <Anchor href={url.loginUrl}>Sign in</Anchor>
        </>
      }
    >
      <form action={url.registrationAction} method="post" onSubmit={() => setSubmitting(true)}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Free during the beta. We’ll send you an email to confirm your address.
          </Text>
          {otherFields.map(field)}
          {nameFields.length > 0 && (
            <SimpleGrid cols={{ base: 1, xs: 2 }}>{nameFields.map(field)}</SimpleGrid>
          )}
          {passwordRequired && (
            <>
              <PasswordInput
                name="password"
                label="Password"
                autoComplete="new-password"
                required
                error={errorOf('password')}
              />
              <PasswordInput
                name="password-confirm"
                label="Confirm password"
                autoComplete="new-password"
                required
                error={errorOf('password-confirm')}
              />
            </>
          )}
          {termsAcceptanceRequired && (
            <Checkbox
              name="termsAccepted"
              required
              label="I accept the terms of use"
              error={errorOf('termsAccepted')}
            />
          )}
          <Button
            type="submit"
            variant="gradient"
            size="md"
            fullWidth
            loading={submitting}
            leftSection={<IconUserPlus size={18} />}
          >
            Create account
          </Button>
        </Stack>
      </form>
    </Template>
  );
}
