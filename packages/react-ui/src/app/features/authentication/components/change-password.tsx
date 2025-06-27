import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormField,
  FormItem,
  FormMessage,
  Input,
  Label,
  PopoverContent,
  PopoverTrigger,
  toast,
} from '@openops/components/ui';
import { Popover } from '@radix-ui/react-popover';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { useRef, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { HttpError } from '@/app/lib/api';
import { authenticationApi } from '@/app/lib/authentication-api';
import { passwordValidation } from '@openops/shared';
import { PasswordValidator } from './password-validator';

const ChangePasswordForm = () => {
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const [serverError, setServerError] = useState('');
  const [isPasswordFocused, setPasswordFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const form = useForm<{
    otp: string;
    userId: string;
    newPassword: string;
  }>({
    defaultValues: {
      otp: queryParams.get('otpcode') || '',
      userId: queryParams.get('userId') || '',
      newPassword: '',
    },
  });

  const { mutate, isPending } = useMutation<void, HttpError, any>({
    mutationFn: authenticationApi.resetPassword,
    onSuccess: () => {
      toast({
        title: t('Success'),
        description: t('Your password was changed successfully'),
        duration: 3000,
      });
      navigate('/sign-in');
    },
    onError: (error) => {
      setServerError(
        t('Your password reset request has expired, please request a new one'),
      );
      console.error(error);
    },
  });

  const onSubmit: SubmitHandler<any> = (data) => {
    mutate(data);
  };

  return (
    <Card className="w-[28rem] rounded-sm drop-shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">{t('Reset Password')}</CardTitle>
        <CardDescription>{t('Enter your new password')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="grid gap-2">
            <FormField
              control={form.control}
              name="newPassword"
              rules={{
                required: t('Password is required'),
                validate: passwordValidation,
              }}
              render={({ field }) => (
                <FormItem
                  className="grid space-y-2"
                  onClick={() => inputRef?.current?.focus()}
                  onFocus={() => setPasswordFocused(true)}
                >
                  <Label htmlFor="newPassword">{t('Password')}</Label>
                  <Popover open={isPasswordFocused}>
                    <PopoverTrigger asChild>
                      <Input
                        {...field}
                        required
                        id="newPassword"
                        type="password"
                        placeholder={'********'}
                        className="rounded-sm"
                        ref={inputRef}
                        onBlur={() => setPasswordFocused(false)}
                        onChange={(e) => field.onChange(e)}
                      />
                    </PopoverTrigger>
                    <PopoverContent className="absolute border-2 bg-background p-2 rounded-md right-60 -bottom-16 flex flex-col">
                      <PasswordValidator
                        password={form.getValues().newPassword}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError && <FormMessage>{serverError}</FormMessage>}
            <Button
              className="w-full mt-2"
              loading={isPending}
              onClick={(e) => form.handleSubmit(onSubmit)(e)}
            >
              {t('Confirm')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export { ChangePasswordForm };
