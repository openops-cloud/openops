import { createAction } from '@openops/blocks-framework';

export const stopFlowAction = createAction({
  name: 'end_workflow',
  displayName: 'Stop Execution',
  description: 'Stop the current scope execution (flow or loop iteration)',
  requireToolApproval: false,
  props: {},
  errorHandlingOptions: {
    continueOnFailure: {
      hide: true,
    },
    retryOnFailure: {
      hide: true,
    },
  },
  async run(ctx) {
    ctx.run.stop({ response: {} });
    return true;
  },
});
