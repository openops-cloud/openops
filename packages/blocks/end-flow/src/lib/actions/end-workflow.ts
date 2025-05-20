import { createAction } from '@openops/blocks-framework';

export const endFlowAction = createAction({
  name: 'end_workflow',
  displayName: 'End Workflow',
  description: 'End the current workflow',
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
    return ctx.run.stop({ response: {} }) ?? true;
  },
});
