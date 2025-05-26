import { TeamsMessageAction } from './generate-message-with-buttons';

export function generateMSTeamsRedirectURl(
  action: TeamsMessageAction,
  context: any,
  baseUrl?: string,
): string {
  if (context.run.isTest) {
    return 'https://static.openops.com/test_teams_actions.txt';
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
