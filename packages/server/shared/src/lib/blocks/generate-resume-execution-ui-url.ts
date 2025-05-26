import {
  ActionContext,
  OAuth2Property,
  OAuth2Props,
} from '@openops/blocks-framework';

export function generateResumeExecutionUiUrl(
  action: { buttonText: string },
  context: ActionContext<OAuth2Property<OAuth2Props>>,
  baseUrl?: string,
): string {
  const resumeExecutionRedirectUrl =
    'https://static.openops.com/html/resume_execution.html';

  const url = context.generateResumeUrl(
    {
      queryParams: {
        executionCorrelationId: context.run.pauseId,
        button: action.buttonText,
      },
    },
    baseUrl,
  );

  const uiUrl = new URL(resumeExecutionRedirectUrl);
  uiUrl.search = new URLSearchParams({
    redirectUrl: url,
  }).toString();
  return uiUrl.toString();
}
