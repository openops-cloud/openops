import { BlockMetadataModelSummary } from '@openops/blocks-framework';
import {
  BlockIcon,
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
import { DialogTrigger } from '@radix-ui/react-dialog';
import { t } from 'i18next';
import React, { useEffect, useState } from 'react';

import { CreateOrEditConnectionDialog } from './create-edit-connection-dialog';

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

    const { blocks, isLoading } = blocksHooks.useBlocks({});
    const [searchTerm, setSearchTerm] = useState('');

    const filteredBlocks = filterBlocks(
      aggregateBlocksByProvider(blocks ?? []),
      searchTerm,
    );

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
              authProviderKey={selectedBlock?.auth?.authProviderKey ?? ''}
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
                    return (
                      <div
                        key={index}
                        onClick={() => clickBlock(block.name)}
                        className="border p-2 h-[150px] w-[150px] flex flex-col items-center justify-center hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-lg"
                      >
                        <div className="h-10 flex items-center justify-center">
                          <BlockIcon
                            logoUrl={block.auth?.authProviderLogoUrl}
                            displayIcon={block.auth?.authProviderDisplayIcon}
                            displayName={
                              block.auth?.authProviderDisplayName ?? ''
                            }
                            showTooltip={false}
                            size={'lg'}
                            category={block.categories?.[0]}
                          />
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
