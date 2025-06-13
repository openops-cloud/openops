import { DynamicFormValidationProvider } from '../../builder/dynamic-form-validation/dynamic-form-validation-context';
import { appConnectionsHooks } from '../lib/app-connections-hooks';
import { useConnectionsContext } from './connections-context';
import { CreateOrEditConnectionDialog } from './create-edit-connection-dialog';

type EditConnectionDialogProps = {
  id: string;
  setOpen: (open: boolean) => void;
};

function EditConnectionDialog({
  id,
  setOpen,
}: Readonly<EditConnectionDialogProps>) {
  const { data: connectionToEdit } = appConnectionsHooks.useConnection({
    id,
  });

  const { setRefresh } = useConnectionsContext();

  if (!connectionToEdit) {
    return;
  }

  return (
    <DynamicFormValidationProvider>
      <CreateOrEditConnectionDialog
        open={true}
        authProviderKey={connectionToEdit.authProviderKey}
        onConnectionSaved={() => {
          setRefresh((prev) => !prev);
        }}
        connectionToEdit={connectionToEdit ?? null}
        reconnect={false}
        setOpen={setOpen}
      />
    </DynamicFormValidationProvider>
  );
}

export { EditConnectionDialog };
