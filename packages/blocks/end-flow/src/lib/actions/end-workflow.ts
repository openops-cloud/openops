import { createAction } from '@openops/blocks-framework';

export const stopFlowAction = createAction({
  name: 'stop_flow',
  displayName: 'Stop Execution',
  description: 'Stop the current scope execution (flow or loop iteration)',
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
