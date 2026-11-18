import { Anchor, Button, Checkbox, Divider, Group, PasswordInput, Stack, TextInput } from '@mantine/core';
import { IconLogin2 } from '@tabler/icons-react';
import type { PageProps } from 'keycloakify/login/pages/PageProps';
import { useState } from 'react';
import type { I18n } from '../i18n';
import type { KcContext } from '../KcContext';

/** Keycloak's sign-in form (login.ftl). Field names and the form action are Keycloak's. */
export default function Login(props: PageProps<Extract<KcContext, { pageId: 'login.ftl' }>, I18n>) {
  const { kcContext, i18n, Template, doUseDefaultCss, classes } = props;
  const { realm, url, usernameHidden, login, auth, registrationDisabled, messagesPerField, social } =
    kcContext;
  const [submitting, setSubmitting] = useState(false);

  const hasError = messagesPerField.existsError('username', 'password');
  const error = hasError ? messagesPerField.getFirstError('username', 'password') : undefined;
  const canRegister = realm.password && realm.registrationAllowed && !registrationDisabled;
  const providers = social?.providers ?? [];

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={doUseDefaultCss}
      classes={classes}
      documentTitle="Sign in · KnowGauge"
      // The wrong-credentials error is shown at the fields instead.
      displayMessage={!hasError}
      headerNode="Sign in to KnowGauge"
      infoNode={
        canRegister ? (
          <>
            New to KnowGauge? <Anchor href={url.registrationUrl}>Create an account</Anchor>
          </>
        ) : undefined
      }
      socialProvidersNode={
        realm.password && providers.length > 0 ? (
          <Stack gap="sm">
            <Divider label="or" labelPosition="center" />
            {providers.map((provider) => (
              <Button key={provider.alias} component="a" href={provider.loginUrl} variant="default" fullWidth>
                Continue with {provider.displayName}
              </Button>
            ))}
          </Stack>
        ) : undefined
      }
    >
      {realm.password && (
        <form action={url.loginAction} method="post" onSubmit={() => setSubmitting(true)}>
          <Stack gap="md">
            {!usernameHidden && (
              <TextInput
                name="username"
                label={realm.loginWithEmailAllowed ? 'Email' : 'Username'}
                type={realm.loginWithEmailAllowed ? 'email' : 'text'}
                autoComplete="username"
                defaultValue={login.username ?? ''}
                autoFocus
                required
                error={error}
              />
            )}
            <PasswordInput
              name="password"
              label="Password"
              autoComplete="current-password"
              autoFocus={usernameHidden}
              required
              error={usernameHidden ? error : hasError}
            />
            <Group justify="space-between">
              {realm.rememberMe && !usernameHidden ? (
                <Checkbox
                  name="rememberMe"
                  label="Keep me signed in"
                  defaultChecked={Boolean(login.rememberMe)}
                />
              ) : (
                <span />
              )}
              {realm.resetPasswordAllowed && (
                <Anchor href={url.loginResetCredentialsUrl} size="sm">
                  Forgot password?
                </Anchor>
              )}
            </Group>
            <input type="hidden" name="credentialId" value={auth.selectedCredential ?? ''} />
            <Button
              type="submit"
              variant="gradient"
              size="md"
              fullWidth
              loading={submitting}
              leftSection={<IconLogin2 size={18} />}
            >
              Sign in
            </Button>
          </Stack>
        </form>
      )}
    </Template>
  );
}
