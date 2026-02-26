import { useFlowVersionUndoRedo } from '@/app/features/builder/flow-version-undo-redo/hooks/flow-version-undo-redo';
import { flowsApi } from '@/app/features/flows/lib/flows-api';
import { handleMutationError } from '@/app/interceptors/interceptor-utils';
import { toast } from '@openops/components/ui';
import { FlowOperationType } from '@openops/shared';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { useBuilderStateContext } from '../../builder-hooks';

const useLockAndPublish = () => {
  const [flow, setFlow, setVersion] = useBuilderStateContext((state) => [
    state.flow,
    state.setFlow,
    state.setVersion,
  ]);

  const { clearUndoRedoHistory } = useFlowVersionUndoRedo();

  const { mutate: mutatePublish, isPending: isPublishingPending } = useMutation(
    {
      mutationFn: async () => {
        return flowsApi.update(flow.id, {
          type: FlowOperationType.LOCK_AND_PUBLISH,
          request: {},
        });
      },
      onSuccess: (flow) => {
        clearUndoRedoHistory();
        toast({
          title: t('Success'),
          description: t('Workflow has been published.'),
          duration: 3000,
        });
        setFlow(flow);
        setVersion(flow.version);
      },
      onError: handleMutationError,
    },
  );

  return {
    isPublishingPending,
    mutatePublish,
  };
};

export { useLockAndPublish };
