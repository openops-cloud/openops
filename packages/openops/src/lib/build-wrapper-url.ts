import { encodeFollowUpForm, FollowUpForm } from './follow-up-form';

const RESUME_PAGE = 'resume_execution.html';
const COLLECT_INPUT_PAGE = 'collect_input.html';

// Slack rejects a whole message when one of its button URLs is longer than
// this. It is the strictest limit known for a channel, so anything that
// sizes a form (the Slack block, a settings check) should use it.
export const MAX_BUTTON_URL_LENGTH = 3000;

// The heading is display-only on the form; cutting it keeps the link well
// under MAX_BUTTON_URL_LENGTH.
const MAX_TITLE_LENGTH = 150;

function cutTitle(title: string): string {
  return title.length > MAX_TITLE_LENGTH
    ? `${title.slice(0, MAX_TITLE_LENGTH - 1)}…`
    : title;
}

// Builds the link behind a message button. A button with a form opens the
// collect-input page, which reads the whole form from the link and sends
// each answer back as a resume query param, surfaced in the step output as
// parameters.<field name>. Any other button opens the page that resumes the
// flow directly.
export function buildWrapperUrl({
  frontendUrl,
  isTest,
  resumeUrl,
  form,
}: {
  frontendUrl: string;
  isTest: boolean;
  resumeUrl: string;
  form?: FollowUpForm;
}): string {
  if (form) {
    const params = new URLSearchParams({
      isTest: String(isTest),
      form: encodeFollowUpForm(
        form.title ? { ...form, title: cutTitle(form.title) } : form,
      ),
      redirectUrl: resumeUrl,
    });
    return `${frontendUrl}/html/${COLLECT_INPUT_PAGE}?${params.toString()}`;
  }

  return `${frontendUrl}/html/${RESUME_PAGE}?isTest=${isTest}&redirectUrl=${encodeURIComponent(
    resumeUrl,
  )}`;
}
