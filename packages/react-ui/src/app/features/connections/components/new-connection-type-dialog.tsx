import { BlockMetadataModelSummary } from '@openops/blocks-framework';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  ScrollArea,
} from '@openops/components/ui';
import { FlagId } from '@openops/shared';
import { DialogTrigger } from '@radix-ui/react-dialog';
import { t } from 'i18next';
import React, { useEffect, useState } from 'react';

import { CreateOrEditConnectionDialog } from './create-edit-connection-dialog';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import { DynamicFormValidationProvider } from '@/app/features/builder/dynamic-form-validation/dynamic-form-validation-context';
import {
  aggregateBlocksByProvider,
  filterBlocks,
} from '../lib/connections-utils';

type NewConnectionTypeDialogProps = {
  onConnectionCreated: () => void;
  children: React.ReactNode;
};

const NewConnectionTypeDialog = React.memo(
  ({ onConnectionCreated, children }: NewConnectionTypeDialogProps) => {
    const [dialogTypesOpen, setDialogTypesOpen] = useState(false);
    const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState<
      BlockMetadataModelSummary | undefined
    >(undefined);

    const { data: useConnectionsProvider } = flagsHooks.useFlag<boolean>(
      FlagId.USE_CONNECTIONS_PROVIDER,
    );

    const { blocks, isLoading } = blocksHooks.useBlocks({});
    const [searchTerm, setSearchTerm] = useState('');

    const filteredBlocks = useConnectionsProvider
      ? filterBlocks(aggregateBlocksByProvider(blocks ?? []), searchTerm)
      : filterBlocks(blocks ?? [], searchTerm);

    const clickBlock = (name: string) => {
      setDialogTypesOpen(false);
      setSelectedBlock(blocks?.find((block) => block.name === name));
      setConnectionDialogOpen(true);
    };

    useEffect(() => {
      if (!dialogTypesOpen) {
        setSearchTerm('');
      }
    }, [dialogTypesOpen]);

    const handleDialogOpen = (isOpen: boolean) => {
      setConnectionDialogOpen(isOpen);
      if (!isOpen) {
        setSelectedBlock(undefined);
      }
    };

    return (
      <>
        {selectedBlock && (
          <DynamicFormValidationProvider>
            <CreateOrEditConnectionDialog
              connectionToEdit={null}
              block={selectedBlock}
              open={connectionDialogOpen}
              onConnectionSaved={onConnectionCreated}
              setOpen={handleDialogOpen}
            ></CreateOrEditConnectionDialog>
          </DynamicFormValidationProvider>
        )}
        <Dialog
          open={dialogTypesOpen}
          onOpenChange={(open) => setDialogTypesOpen(open)}
        >
          <DialogTrigger asChild>{children}</DialogTrigger>
          <DialogContent className="min-w-[700px] max-w-[700px] h-[680px] max-h-[680px] flex flex-col">
            <DialogHeader>
              <DialogTitle>{t('New Connection')}</DialogTitle>
            </DialogHeader>
            <div className="mb-4">
              <Input
                placeholder={t('Search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <ScrollArea className="flex-grow overflow-y-auto">
              <div className="grid grid-cols-4 gap-4">
                {(isLoading ||
                  (filteredBlocks && filteredBlocks.length === 0)) && (
                  <div className="text-center">{t('No blocks found')}</div>
                )}
                {!isLoading &&
                  filteredBlocks &&
                  filteredBlocks.map((block, index) => {
                    const logoUrl =
                      useConnectionsProvider && block.auth
                        ? block.auth.authProviderLogoUrl
                        : block.logoUrl;
                    return (
                      <div
                        key={index}
                        onClick={() => clickBlock(block.name)}
                        className="border p-2 h-[150px] w-[150px] flex flex-col items-center justify-center hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-lg"
                      >
                        <div className="h-10 flex items-center justify-center">
                          <img
                            className="w-10"
                            alt={block.auth?.authProviderDisplayName ?? ''}
                            src={logoUrl}
                          ></img>
                        </div>
                        <div className="mt-2 text-center text-md">
                          {block.displayName}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  {t('Close')}
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  },
);

NewConnectionTypeDialog.displayName = 'NewConnectionTypeDialog';
export { NewConnectionTypeDialog };
