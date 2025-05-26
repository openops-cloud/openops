/**
 * Interface for Slack action definition (copied to avoid circular dependencies)
 */
export interface SlackActionDefinition {
  buttonText: string;
  buttonStyle: string;
  confirmationPrompt?: boolean;
  confirmationPromptText?: string;
  url?: string;
}
export function generateSlackRedirectUrl(
  action: SlackActionDefinition,
  context: any,
  baseUrl?: string,
): string {
  if (context.run.isTest) {
    return 'https://static.openops.com/test_slack_interactions.txt';
  }
  const resumeExecutionRedirectUrl =
    'https://static.openops.com/html/resume_execution.html';

  const url = context.generateResumeUrl({
    queryParams: {
      executionCorrelationId: context.run.pauseId,
      button: action.buttonText,
    },
    baseUrl,
  });

  const uiUrl = new URL(resumeExecutionRedirectUrl);
  uiUrl.search = new URLSearchParams({
    redirectUrl: url.toString(),
  }).toString();
  return uiUrl.toString();
}
