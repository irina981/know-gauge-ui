import { MantineProvider } from '@mantine/core';
import DefaultPage from 'keycloakify/login/DefaultPage';
import { lazy, Suspense } from 'react';
import { theme } from '@/app/theme';
import { useI18n } from './i18n';
import type { KcContext } from './KcContext';
import KgTemplate from './KgTemplate';
import './login.css';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const LoginResetPassword = lazy(() => import('./pages/LoginResetPassword'));
const LoginUpdatePassword = lazy(() => import('./pages/LoginUpdatePassword'));
const LoginVerifyEmail = lazy(() => import('./pages/LoginVerifyEmail'));
const Info = lazy(() => import('./pages/Info'));
const ErrorPage = lazy(() => import('./pages/Error'));
const LogoutConfirm = lazy(() => import('./pages/LogoutConfirm'));
const UserProfileFormFields = lazy(() => import('keycloakify/login/UserProfileFormFields'));

/**
 * The KnowGauge login theme: Keycloak renders this instead of its own pages (`window.kcContext` is set). The pages
 * people see (sign in, register, passwords, email confirmation, messages) are ours, with Mantine and the app's
 * theme. Rarely shown pages (one-time codes, identity provider linking, …) are Keycloakify's defaults inside the
 * same frame, styled by login.css.
 */
export default function KcPage({ kcContext }: { kcContext: KcContext }) {
  const { i18n } = useI18n({ kcContext });
  const common = { i18n, Template: KgTemplate, doUseDefaultCss: false } as const;

  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Suspense>
        {(() => {
          switch (kcContext.pageId) {
            case 'login.ftl':
              return <Login kcContext={kcContext} {...common} />;
            case 'register.ftl':
              return <Register kcContext={kcContext} {...common} />;
            case 'login-reset-password.ftl':
              return <LoginResetPassword kcContext={kcContext} {...common} />;
            case 'login-update-password.ftl':
              return <LoginUpdatePassword kcContext={kcContext} {...common} />;
            case 'login-verify-email.ftl':
              return <LoginVerifyEmail kcContext={kcContext} {...common} />;
            case 'info.ftl':
              return <Info kcContext={kcContext} {...common} />;
            case 'error.ftl':
              return <ErrorPage kcContext={kcContext} {...common} />;
            case 'logout-confirm.ftl':
              return <LogoutConfirm kcContext={kcContext} {...common} />;
            default:
              return (
                <DefaultPage
                  kcContext={kcContext}
                  {...common}
                  UserProfileFormFields={UserProfileFormFields}
                  doMakeUserConfirmPassword
                />
              );
          }
        })()}
      </Suspense>
    </MantineProvider>
  );
}
