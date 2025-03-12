import { createAction } from '@openops/blocks-framework';
import { networkUtls } from '@openops/server-shared';

export const createApprovalLink = createAction({
  name: 'create_approval_links',
  displayName: 'Create Approval Links',
  description:
    'Create links only without pausing the flow, use wait for approval to pause',
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
    const baseUrl = await networkUtls.getPublicUrl();

    return {
      approvalLink: ctx.generateResumeUrl(
        {
          queryParams: { action: 'approve' },
        },
        baseUrl,
      ),
      disapprovalLink: ctx.generateResumeUrl(
        {
          queryParams: { action: 'disapprove' },
        },
        baseUrl,
      ),
    };
  },
});
