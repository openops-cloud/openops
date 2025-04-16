import { useDynamicFormValidationContext } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';
import { appConnectionsApi } from '@/app/features/connections/lib/app-connections-api';
import { appConnectionUtils } from '@/app/features/connections/lib/app-connections-utils';
import { api } from '@/app/lib/api';
import { authenticationSession } from '@/app/lib/authentication-session';
import { typeboxResolver } from '@hookform/resolvers/typebox';
import {
  BasicAuthProperty,
  BlockMetadataModel,
  BlockMetadataModelSummary,
  CustomAuthProperty,
  OAuth2Property,
  OAuth2Props,
  PropertyType,
  SecretTextProperty,
} from '@openops/blocks-framework';
import {
  Button,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  INTERNAL_ERROR_TOAST,
  Markdown,
  Separator,
  toast,
} from '@openops/components/ui';
import {
  AppConnectionWithoutSensitiveData,
  ApplicationErrorParams,
  ErrorCode,
  isNil,
  UpsertAppConnectionRequestBody,
} from '@openops/shared';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  buildConnectionSchema,
  createDefaultValues,
} from '../lib/connections-utils';
import { BasicAuthConnectionSettings } from './basic-secret-connection-settings';
import { CustomAuthConnectionSettings } from './custom-auth-connection-settings';
import { OAuth2ConnectionSettings } from './oauth2-connection-settings';
import { SecretTextConnectionSettings } from './secret-text-connection-settings';

class ConnectionNameAlreadyExists extends Error {
  constructor() {
    super('Connection name already exists');
    this.name = 'ConnectionNameAlreadyExists';
  }
}

export type CreateEditConnectionDialogContentProps = {
  block: BlockMetadataModelSummary | BlockMetadataModel;
  onConnectionCreated: (name: string) => void;
  reconnectConnection: AppConnectionWithoutSensitiveData | null;
  showBackButton?: boolean;
  setOpen: (open: boolean) => void;
};

const CreateEditConnectionDialogContent = ({
  block,
  onConnectionCreated,
  reconnectConnection,
  showBackButton = false,
  setOpen,
}: CreateEditConnectionDialogContentProps) => {
  const { auth } = block;

  const { formSchema, setFormSchema, formSchemaRef } =
    useDynamicFormValidationContext();

  useEffect(() => {
    if (!formSchemaRef.current && block) {
      const schema = buildConnectionSchema(block);

      if (schema) {
        formSchemaRef.current = true;
        setFormSchema(schema);
      }
    }
  }, [block, formSchemaRef]);

  const form = useForm<{
    request: UpsertAppConnectionRequestBody;
  }>({
    defaultValues: {
      request: createDefaultValues(
        block,
        reconnectConnection
          ? reconnectConnection.name
          : appConnectionUtils.findName(block.name),
      ),
    },
    mode: 'onChange',
    reValidateMode: 'onChange',
    resolver: typeboxResolver(formSchema),
  });

  useEffect(() => {
    form.trigger();
  }, [formSchema]);

  const [errorMessage, setErrorMessage] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      setErrorMessage('');
      const formValues = form.getValues().request;
      if (!reconnectConnection) {
        const connections = await appConnectionsApi.list({
          projectId: authenticationSession.getProjectId()!,
          limit: 10000,
        });
        const existingConnection = connections.data.find(
          (connection) => connection.name === formValues.name,
        );

        if (!isNil(existingConnection)) {
          throw new ConnectionNameAlreadyExists();
        }
      }
      return appConnectionsApi.upsert(formValues);
    },
    onSuccess: () => {
      setOpen(false);
      const name = form.getValues().request.name;
      onConnectionCreated(name);
      setErrorMessage('');
    },
    onError: (err) => {
      if (err instanceof ConnectionNameAlreadyExists) {
        form.setError('request.name', {
          message: t('Name is already used'),
        });
      } else if (api.isError(err)) {
        const apError = err.response?.data as ApplicationErrorParams;
        console.error(apError);
        if (apError.code === ErrorCode.INVALID_CLOUD_CLAIM) {
          setErrorMessage(
            t(
              'Could not claim the authorization code, make sure you have correct settings and try again.',
            ),
          );
        } else if (apError.code === ErrorCode.INVALID_APP_CONNECTION) {
          setErrorMessage(
            t('Connection failed with error {msg}', {
              msg: apError.params.error,
            }),
          );
        }
      } else {
        toast(INTERNAL_ERROR_TOAST);
        console.error(err);
      }
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-5 font-bold text-[32px] text-primary-400 dark:text-primary">
          {showBackButton && (
            <ArrowLeft
              role="button"
              scale={1}
              onClick={() => setOpen(false)}
              className="w-6 h-6"
            ></ArrowLeft>
          )}
          {reconnectConnection
            ? t('Reconnect {displayName} Connection', {
                displayName: reconnectConnection.name,
              })
            : t('Create {displayName} Connection', {
                displayName: block.displayName,
              })}
        </DialogTitle>
      </DialogHeader>
      <ScrollArea className="h-full">
        <Markdown
          markdown={auth?.description}
          showCopyButton={false}
        ></Markdown>
        {auth?.description && <Separator className="my-4" />}
        <Form {...form}>
          <form
            // eslint-disable-next-line no-console
            onSubmit={() => console.log('submitted')}
            className="flex flex-col gap-4"
          >
            <FormField
              name="request.name"
              control={form.control}
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2">
                  <FormLabel htmlFor="name">{t('Connection Name')}</FormLabel>
                  <FormControl>
                    <Input
                      disabled={!isNil(reconnectConnection)}
                      {...field}
                      required
                      id="name"
                      type="text"
                      placeholder={t('Connection name')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            ></FormField>
            {auth?.type === PropertyType.SECRET_TEXT && (
              <SecretTextConnectionSettings
                authProperty={block.auth as SecretTextProperty<boolean>}
              />
            )}
            {auth?.type === PropertyType.BASIC_AUTH && (
              <BasicAuthConnectionSettings
                authProperty={block.auth as BasicAuthProperty}
              />
            )}
            {auth?.type === PropertyType.CUSTOM_AUTH && (
              <CustomAuthConnectionSettings
                authProperty={block.auth as CustomAuthProperty<any>}
              />
            )}
            {auth?.type === PropertyType.OAUTH2 && (
              <OAuth2ConnectionSettings
                authProperty={block.auth as OAuth2Property<OAuth2Props>}
                block={block}
                reconnectConnection={reconnectConnection}
              />
            )}

            <DialogFooter className="mt-[60px]">
              <Button
                onClick={(e) => form.handleSubmit(() => mutate())(e)}
                loading={isPending}
                type="submit"
                size="lg"
                disabled={!form.formState.isValid}
              >
                {t('Save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </ScrollArea>

      {errorMessage && (
        <div className="text-left text-sm text-destructive mt-4">
          {errorMessage}
        </div>
      )}
    </>
  );
};

CreateEditConnectionDialogContent.displayName =
  'CreateEditConnectionDialogContent';
export { CreateEditConnectionDialogContent };
