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
import { PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';

import { api } from '@/app/lib/api';
import { FolderDto } from '@openops/shared';

import { useRefetchFolderTree } from '@/app/features/folders/hooks/refetch-folder-tree';
import { foldersApi } from '../lib/folders-api';
import { FormMessages } from './form-error-messages';
import { FOLDER_EXISTS_MSG, FolderFormSchema } from './form-schema';

type CreateFolderFormSchema = Static<typeof FolderFormSchema>;

type Props = {
  updateSearchParams: (folderId: string | undefined) => void;
};

const AddNewFolderDialog = ({ updateSearchParams }: Props) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const form = useForm<CreateFolderFormSchema>({
    resolver: typeboxResolver(FolderFormSchema),
    mode: 'onChange',
    defaultValues: {
      displayName: '',
    },
  });

  const refetchFolderTree = useRefetchFolderTree();

  const { mutate, isPending } = useMutation<
    FolderDto,
    Error,
    CreateFolderFormSchema
  >({
    mutationFn: async (data) => {
      return await foldersApi.create({
        displayName: data.displayName,
      });
    },
    onSuccess: (folder) => {
      form.reset();
      refetchFolderTree();
      setIsDialogOpen(false);
      updateSearchParams(folder.id);
      toast({
        title: t('Added folder successfully'),
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

  const opDialogOpenChange = (isOpen: boolean) => {
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
    <div className="flex items-center justify-center">
      <Dialog open={isDialogOpen} onOpenChange={opDialogOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary/90 enabled:hover:text-primary/90"
          >
            <PlusIcon size={18} className="mr-1" />
            {t('New folder')}
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('New Folder')}</DialogTitle>
            <DialogDescription>
              {t('Create a new folder to organize your workflows.')}
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit((data) => mutate(data))}>
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <Input
                      {...field}
                      required
                      id="folder"
                      placeholder={t('Folder Name')}
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
    </div>
  );
};

AddNewFolderDialog.displayName = 'AddNewFolderDialog';
export { AddNewFolderDialog };
