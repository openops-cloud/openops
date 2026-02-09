import { createAction } from '@openops/blocks-framework';
import { networkUtls } from '@openops/server-shared';

function wrapWithResumePage(
  backendUrl: string,
  baseUrl: string,
  isTest: boolean,
): string {
  return `${baseUrl}html/resume_execution.html?isTest=${isTest}&redirectUrl=${encodeURIComponent(
    backendUrl,
  )}`;
}

export const createApprovalLink = createAction({
  name: 'create_approval_links',
  displayName: 'Create Approval Links',
  description:
    'Create links only without pausing the flow, use wait for approval to pause',
  isWriteAction: false,
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

    const approvalBackendUrl = ctx.generateResumeUrl({
      queryParams: { action: 'approve' },
    });
    const disapprovalBackendUrl = ctx.generateResumeUrl({
      queryParams: { action: 'disapprove' },
    });

    return {
      approvalLink: wrapWithResumePage(
        approvalBackendUrl,
        baseUrl,
        ctx.run.isTest,
      ),
      disapprovalLink: wrapWithResumePage(
        disapprovalBackendUrl,
        baseUrl,
        ctx.run.isTest,
      ),
    };
  },
});
