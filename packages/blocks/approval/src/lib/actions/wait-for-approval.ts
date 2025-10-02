import { createAction } from '@openops/blocks-framework';
import { ExecutionType } from '@openops/shared';

export const waitForApprovalLink = createAction({
  name: 'wait_for_approval',
  displayName: 'Wait for Approval',
  description: 'Pauses the flow and wait for the approval from the user',
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
    if (ctx.executionType === ExecutionType.BEGIN) {
      ctx.run.pause({
        pauseMetadata: {
          response: {},
        },
      });

      return {
        approved: true,
      };
    } else {
      return {
        approved: ctx.resumePayload.queryParams['action'] === 'approve',
      };
    }
  },
});
