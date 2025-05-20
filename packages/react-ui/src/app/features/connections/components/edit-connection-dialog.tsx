import { blocksHooks } from '../../blocks/lib/blocks-hook';
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
  const { data: editConnection } = appConnectionsHooks.useConnection({
    id,
  });

  const { blocks } = blocksHooks.useBlocks({});

  const block = blocks?.find(
    (block) => block.name === editConnection?.blockName,
  );

  const { setRefresh } = useConnectionsContext();

  if (!block) {
    return;
  }

  return (
    <DynamicFormValidationProvider>
      <CreateOrEditConnectionDialog
        open={true}
        block={block}
        onConnectionSaved={() => {
          setRefresh((prev) => !prev);
        }}
        editConnection={editConnection ?? null}
        reconnect={false}
        setOpen={setOpen}
      />
    </DynamicFormValidationProvider>
  );
}

export { EditConnectionDialog };
