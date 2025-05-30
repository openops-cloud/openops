import { typeboxResolver } from '@hookform/resolvers/typebox';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  FormField,
  FormItem,
  Input,
  INTERNAL_ERROR_TOAST,
  toast,
} from '@openops/components/ui';
import { Static } from '@sinclair/typebox';
import { useMutation } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';

import { api } from '@/app/lib/api';
import { Folder } from '@openops/shared';

import { foldersApi } from '../lib/folders-api';

import { FormMessages } from './form-error-messages';
import { FOLDER_EXISTS_MSG, FolderFormSchema } from './form-schema';

type CreateSubfolderSchema = Static<typeof FolderFormSchema>;

const CreateSubfolderDialog = ({
  children,
  folderId,
  onCreate,
}: {
  children: React.ReactNode;
  folderId: string;
  onCreate: () => void;
}) => {
  const [isOpen, setIsDialogOpen] = useState(false);
  const form = useForm<CreateSubfolderSchema>({
    resolver: typeboxResolver(FolderFormSchema),
    mode: 'onChange',
    defaultValues: {
      displayName: '',
    },
  });

  const { mutate, isPending } = useMutation<
    Folder,
    Error,
    CreateSubfolderSchema
  >({
    mutationFn: async (data) =>
      await foldersApi.create({
        displayName: data.displayName,
        parentFolderId: folderId,
      }),
    onSuccess: (data) => {
      setIsDialogOpen(false);
      onCreate();
      form.reset({
        displayName: data.displayName,
      });
      toast({
        title: t('Created subfolder successfully'),
      });
    },
    onError: (error) => {
      if (api.isError(error)) {
        switch (error.response?.status) {
          case HttpStatusCode.Conflict: {
            form.setError('root.serverError', {
              message: FOLDER_EXISTS_MSG,
            });
            break;
          }
          default: {
            toast(INTERNAL_ERROR_TOAST);
            break;
          }
        }
      }
    },
  });

  const onDialogOpenChange = (isOpen: boolean) => {
    setIsDialogOpen(isOpen);
    form.reset();
  };

  const displayName = useWatch({
    name: 'displayName',
    control: form.control,
  });

  useEffect(() => {
    form.clearErrors('root');
  }, [displayName, form]);

  const errorMessages = [
    form?.formState?.errors?.root?.serverError?.message,
    form.getValues().displayName.length
      ? form?.formState?.errors?.displayName?.message?.pattern
      : form?.formState?.errors?.displayName?.message?.minLength,
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onDialogOpenChange}>
      <DialogTrigger className="w-full" asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Create Subfolder')}</DialogTitle>
          <DialogDescription>{t('Type the subfolder name.')}</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit((data) => mutate(data))}>
            <FormField
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <Input
                    {...field}
                    required
                    id="displayName"
                    placeholder={t('New Subfolder Name')}
                    className="rounded-sm"
                  />
                </FormItem>
              )}
            />
            <FormMessages messages={errorMessages} />
            <DialogFooter>
              <Button type="submit" loading={isPending}>
                {t('Confirm')}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};

CreateSubfolderDialog.displayName = 'CreateSubfolderDialog';

export { CreateSubfolderDialog };
