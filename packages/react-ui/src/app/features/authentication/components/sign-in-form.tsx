import { typeboxResolver } from '@hookform/resolvers/typebox';
import {
  Button,
  Form,
  FormField,
  FormItem,
  FormMessage,
  Input,
  Label,
} from '@openops/components/ui';
import { Static, Type } from '@sinclair/typebox';
import { useMutation } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { t } from 'i18next';
import { SubmitHandler, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { HttpError, api } from '@/app/lib/api';
import { authenticationApi } from '@/app/lib/authentication-api';
import { authenticationSession } from '@/app/lib/authentication-session';
import {
  AuthenticationResponse,
  FlagId,
  OpsEdition,
  SignInRequest,
} from '@openops/shared';
import { useEffectOnce } from 'react-use';
import { navigationUtil } from '../../../lib/navigation-util';
import { emailRegex } from '../lib/password-validation-utils';

const SignInSchema = Type.Object({
  email: Type.String({
    pattern: emailRegex.source,
    errorMessage: t('Email is invalid'),
  }),
  password: Type.String({
    minLength: 1,
    errorMessage: t('Password is required'),
  }),
});

type SignInSchema = Static<typeof SignInSchema>;

const SignInForm: React.FC = () => {
  const form = useForm<SignInSchema>({
    resolver: typeboxResolver(SignInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onChange',
  });

  useEffectOnce(() => {
    authenticationSession.logOut({
      userInitiated: false,
    });
  });

  const { data: edition } = flagsHooks.useFlag(FlagId.EDITION);
  const { data: showSignUpLink } = flagsHooks.useFlag(FlagId.SHOW_SIGN_UP_LINK);
  const navigate = useNavigate();

  const { mutate, isPending } = useMutation<
    AuthenticationResponse,
    HttpError,
    SignInRequest
  >({
    mutationFn: authenticationApi.signIn,
    onSuccess: (data) => {
      authenticationSession.saveResponse(data);

      const lastVisitedPage = navigationUtil.get();
      navigationUtil.clear();
      const nextPage = lastVisitedPage ?? '/';
      navigate(nextPage);
    },
    onError: (error) => {
      if (api.isError(error)) {
        switch (error.response?.status) {
          case HttpStatusCode.Unauthorized:
          case HttpStatusCode.BadRequest: {
            form.setError('root.serverError', {
              message: t('Invalid email or password'),
            });
            break;
          }
          default: {
            form.setError('root.serverError', {
              message: t('Something went wrong, please try again later'),
            });
            break;
          }
        }
        return;
      }
    },
  });

  const onSubmit: SubmitHandler<SignInRequest> = (data) => {
    form.setError('root.serverError', {
      message: undefined,
    });
    mutate(data);
  };

  return (
    <>
      <Form {...form}>
        <form className="grid space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="grid space-y-2">
                <Label htmlFor="email">{t('Email')}</Label>
                <Input
                  {...field}
                  required
                  id="email"
                  type="text"
                  placeholder={'email@example.com'}
                  className="rounded-sm"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="grid space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('Password')}</Label>
                  {edition !== OpsEdition.COMMUNITY && (
                    <Link
                      to="/forget-password"
                      className="text-muted-foreground text-sm hover:text-primary transition-all duration-200"
                    >
                      {t('Forgot your password?')}
                    </Link>
                  )}
                </div>
                <Input
                  {...field}
                  required
                  id="password"
                  type="password"
                  placeholder={'********'}
                  className="rounded-sm"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          {form?.formState?.errors?.root?.serverError && (
            <FormMessage>
              {form.formState.errors.root.serverError.message}
            </FormMessage>
          )}
          <Button
            loading={isPending}
            onClick={(e) => form.handleSubmit(onSubmit)(e)}
          >
            {t('Sign in')}
          </Button>
        </form>
      </Form>
      {showSignUpLink && (
        <div className="mt-4 text-center text-sm">
          {t("Don't have an account?")}
          <Link
            to="/sign-up"
            className="pl-1 text-muted-foreground hover:text-primary text-sm transition-all duration-200"
          >
            {t('Sign up')}
          </Link>
        </div>
      )}
    </>
  );
};

SignInForm.displayName = 'SignIn';

export { SignInForm };
