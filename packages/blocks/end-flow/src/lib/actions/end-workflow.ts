import { createAction } from '@openops/blocks-framework';

export const stopFlowAction = createAction({
  name: 'stop_workflow',
  displayName: 'Stop Execution',
  description: 'Stop the current scope execution (workflow or loop iteration)',
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
