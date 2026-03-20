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
  FormMessage,
  toast,
} from '@openops/components/ui';
import { Static, Type } from '@sinclair/typebox';
import { MutationFunction, useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { SearchableSelect } from '@/app/common/components/searchable-select';
import { useRefetchFolderTree } from '@/app/features/folders/hooks/refetch-folder-tree';
import { handleMutationError } from '@/app/interceptors/interceptor-utils';
import { foldersHooks } from '../lib/folders-hooks';
import {
  buildFolderHierarchy,
  getFolderHierarchyDisplayNames,
} from '../lib/folders-utils';

const MoveToFolderFormSchema = Type.Object({
  folder: Type.String({
    errorMessage: t('Please select a folder'),
  }),
});

export type MoveToFolderFormSchema = Static<typeof MoveToFolderFormSchema>;

type MoveToFolderDialogProps<T> = {
  children: React.ReactNode;
  onMoveTo?: (folderId: string) => void;
  apiMutateFn: MutationFunction<T, MoveToFolderFormSchema>;
  displayName: string;
  excludeFolderIds?: string[];
};

function MoveToFolderDialog<T extends object>({
  children,
  onMoveTo,
  apiMutateFn,
  displayName,
  excludeFolderIds,
}: MoveToFolderDialogProps<T>) {
  const form = useForm<MoveToFolderFormSchema>({
    resolver: typeboxResolver(MoveToFolderFormSchema),
  });

  const { folderItems, isLoading } = foldersHooks.useFolderItems();

  const foldersHierarchy = useMemo(
    () => buildFolderHierarchy(folderItems, excludeFolderIds),
    [excludeFolderIds, folderItems],
  );

  const folderOptions = useMemo(
    () =>
      getFolderHierarchyDisplayNames(foldersHierarchy).map((o) => ({
        value: o.id,
        label: o.displayName,
      })),
    [foldersHierarchy],
  );

  const [isDialogOpened, setIsDialogOpened] = useState(false);
  const refetchFolderTree = useRefetchFolderTree();
  const { mutate, isPending } = useMutation<T, Error, MoveToFolderFormSchema>({
    mutationFn: apiMutateFn,
    onSuccess: () => {
      onMoveTo?.(form.getValues().folder);
      refetchFolderTree();
      setIsDialogOpened(false);
      toast({
        title: t('Moved workflow successfully'),
      });
    },
    onError: handleMutationError,
  });

  return (
    <Dialog onOpenChange={setIsDialogOpened} open={isDialogOpened}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('Move')} {displayName}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="mb-2">
          {t('Move to a different folder')}
        </DialogDescription>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit((data) => mutate(data))}>
            <FormField
              control={form.control}
              name="folder"
              render={({ field }) => (
                <FormItem>
                  <SearchableSelect
                    onChange={field.onChange}
                    disabled={isLoading || folderItems?.length === 0}
                    value={field.value}
                    placeholder={t('Select Folder')}
                    options={folderOptions}
                  />
                </FormItem>
              )}
            />
            {form?.formState?.errors?.root?.serverError && (
              <FormMessage>
                {form.formState.errors.root.serverError.message}
              </FormMessage>
            )}
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
}

export { MoveToFolderDialog, MoveToFolderDialogProps };
