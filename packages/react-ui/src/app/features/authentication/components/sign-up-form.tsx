import {
  Button,
  Form,
  FormField,
  FormItem,
  FormMessage,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@openops/components/ui';
import { useMutation } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { t } from 'i18next';
import { useRef, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { api, HttpError } from '@/app/lib/api';
import { authenticationApi } from '@/app/lib/authentication-api';
import { authenticationSession } from '@/app/lib/authentication-session';
import {
  AuthenticationResponse,
  emailRegex,
  passwordValidation,
  SignUpRequest,
} from '@openops/shared';

import { PasswordValidator } from './password-validator';

type SignUpSchema = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  newsLetter: boolean;
};

const SignUpForm = () => {
  const [searchParams] = useSearchParams();

  const form = useForm<SignUpSchema>({
    defaultValues: {
      newsLetter: false,
      password: '',
      email: searchParams.get('email') || '',
    },
  });

  const navigate = useNavigate();

  const { mutate, isPending } = useMutation<
    AuthenticationResponse,
    HttpError,
    SignUpRequest
  >({
    mutationFn: authenticationApi.signUp,
    onSuccess: (data) => {
      if (data.verified) {
        authenticationSession.saveResponse(data);
        navigate('/');
      }
    },
    onError: (error) => {
      if (api.isError(error)) {
        switch (error.response?.status) {
          case HttpStatusCode.Conflict: {
            form.setError('root.serverError', {
              message: t('Email is already used'),
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

  const onSubmit: SubmitHandler<SignUpSchema> = (data) => {
    form.setError('root.serverError', {
      message: undefined,
    });
    mutate({
      ...data,
      email: data.email.trim().toLowerCase(),
      trackEvents: true,
    });
  };

  const [isPasswordFocused, setPasswordFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Form {...form}>
        <form className="grid space-y-4">
          <div className={'flex flex-row gap-2'}>
            <FormField
              control={form.control}
              name="firstName"
              rules={{
                required: t('First name is required'),
              }}
              render={({ field }) => (
                <FormItem className="w-full grid space-y-2">
                  <Label htmlFor="firstName">{t('First Name')}</Label>
                  <Input
                    {...field}
                    required
                    id="firstName"
                    type="text"
                    placeholder={'John'}
                    className="rounded-sm"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              rules={{
                required: t('Last name is required'),
              }}
              render={({ field }) => (
                <FormItem className="w-full grid space-y-2">
                  <Label htmlFor="lastName">{t('Last Name')}</Label>
                  <Input
                    {...field}
                    required
                    id="lastName"
                    type="text"
                    placeholder={'Doe'}
                    className="rounded-sm"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="email"
            rules={{
              required: t('Email is required'),
              validate: (email: string) =>
                emailRegex.test(email) || t('Email is invalid'),
            }}
            render={({ field }) => (
              <FormItem className="grid space-y-2">
                <Label htmlFor="email">{t('Email')}</Label>
                <Input
                  {...field}
                  required
                  id="email"
                  type="email"
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
            rules={{
              required: t('Password is required'),
              validate: passwordValidation,
            }}
            render={({ field }) => (
              <FormItem
                className="grid space-y-2"
                onClick={() => inputRef?.current?.focus()}
                onFocus={() => {
                  setPasswordFocused(true);
                  setTimeout(() => inputRef?.current?.focus());
                }}
                onBlur={() => setPasswordFocused(false)}
              >
                <Label htmlFor="password">{t('Password')}</Label>
                <Popover open={isPasswordFocused}>
                  <PopoverTrigger asChild>
                    <Input
                      {...field}
                      required
                      id="password"
                      type="password"
                      placeholder={'********'}
                      className="rounded-sm"
                      ref={inputRef}
                      onChange={(e) => field.onChange(e)}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="absolute border-2 bg-background p-2 !pointer-events-none rounded-md right-60 -bottom-16 flex flex-col">
                    <PasswordValidator password={form.getValues().password} />
                  </PopoverContent>
                </Popover>
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
            {t('Sign up')}
          </Button>
        </form>
      </Form>

      <div className="mt-4 text-center text-sm">
        {t('Already have an account?')}
        <Link
          to="/sign-in"
          className="pl-1 text-muted-foreground hover:text-primary text-sm transition-all duration-200"
        >
          {t('Sign in')}
        </Link>
      </div>
    </>
  );
};

SignUpForm.displayName = 'SignUp';

export { SignUpForm };
