const RESUME_PAGE = 'resume_execution.html';
const COLLECT_INPUT_PAGE = 'collect_input.html';

const ANSWER_FORMATS = new Set(['text', 'email', 'number']);
const DEFAULT_ANSWER_FORMAT = 'text';

export type ButtonFollowUp = {
  question: string;
  answerFormat?: string;
  noAnswerOption?: string;
  title?: string;
};

// The collect-input page sends the answer back as the `answer` resume query
// param, surfaced in the step output as parameters.answer.
export function buildWrapperUrl({
  frontendUrl,
  isTest,
  resumeUrl,
  followUp,
}: {
  frontendUrl: string;
  isTest: boolean;
  resumeUrl: string;
  followUp?: ButtonFollowUp;
}): string {
  const question = followUp?.question?.trim();

  if (!question) {
    return `${frontendUrl}/html/${RESUME_PAGE}?isTest=${isTest}&redirectUrl=${encodeURIComponent(
      resumeUrl,
    )}`;
  }

  const format =
    followUp?.answerFormat && ANSWER_FORMATS.has(followUp.answerFormat)
      ? followUp.answerFormat
      : DEFAULT_ANSWER_FORMAT;

  const params = new URLSearchParams({
    isTest: String(isTest),
    question,
    format,
    redirectUrl: resumeUrl,
  });

  const noAnswerOption = followUp?.noAnswerOption?.trim();
  if (noAnswerOption) {
    params.set('noAnswerOption', noAnswerOption);
  }

  const title = followUp?.title?.trim();
  if (title) {
    params.set('title', title);
  }

  return `${frontendUrl}/html/${COLLECT_INPUT_PAGE}?${params.toString()}`;
}
