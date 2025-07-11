import { Dialog, DialogContent } from '@openops/components/ui';
import React from 'react';
import {
  CreateEditConnectionDialogContent,
  CreateEditConnectionDialogContentProps,
} from './create-edit-connection-dialog-content';

type ConnectionDialogProps = {
  open: boolean;
  authProviderKey: string;
} & CreateEditConnectionDialogContentProps;

const CreateOrEditConnectionDialog = React.memo(
  ({
    open,
    setOpen,
    onConnectionSaved,
    reconnect,
    connectionToEdit,
    authProviderKey,
  }: ConnectionDialogProps) => {
    return (
      <Dialog
        open={open}
        onOpenChange={(open) => setOpen(open)}
        key={connectionToEdit?.id}
      >
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          className="max-h-[70vh] min-w-[450px] max-w-[450px] lg:min-w-[650px] lg:max-w-[850px] px-16 pt-[38px] pb-10 overflow-y-auto"
        >
          <CreateEditConnectionDialogContent
            setOpen={setOpen}
            authProviderKey={authProviderKey}
            onConnectionSaved={onConnectionSaved}
            connectionToEdit={connectionToEdit}
            reconnect={reconnect}
          />
        </DialogContent>
      </Dialog>
    );
  },
);

CreateOrEditConnectionDialog.displayName = 'CreateOrEditConnectionDialog';
export { CreateOrEditConnectionDialog };
