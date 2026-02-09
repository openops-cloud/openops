import { createAction } from '@openops/blocks-framework';
import { networkUtls, SharedSystemProp, system } from '@openops/server-shared';

function wrapWithResumePage(
  backendUrl: string,
  baseUrl: string,
  isTest: boolean,
): string {
  return `${baseUrl}/html/resume_execution.html?isTest=${isTest}&redirectUrl=${encodeURIComponent(
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
    const frontendUrl = system
      .getOrThrow(SharedSystemProp.FRONTEND_URL)
      .replace(/\/$/, '');

    const apiUrl = await networkUtls.getPublicUrl();

    const approvalBackendUrl = ctx.generateResumeUrl(
      {
        queryParams: { action: 'approve' },
      },
      apiUrl,
    );
    const disapprovalBackendUrl = ctx.generateResumeUrl(
      {
        queryParams: { action: 'disapprove' },
      },
      apiUrl,
    );

    return {
      approvalLink: wrapWithResumePage(
        approvalBackendUrl,
        frontendUrl,
        ctx.run.isTest,
      ),
      disapprovalLink: wrapWithResumePage(
        disapprovalBackendUrl,
        frontendUrl,
        ctx.run.isTest,
      ),
    };
  },
});
