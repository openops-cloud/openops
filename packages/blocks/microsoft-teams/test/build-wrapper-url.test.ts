import { buildWrapperUrl } from '../src/lib/common/build-wrapper-url';

const baseParams = {
  frontendUrl: 'https://app.openops.com',
  isTest: false,
  resumeUrl:
    'https://api.openops.com/v1/flow-runs/run-1/requests/pause-1?button=Not%20mine&path=step_1',
};

const encodedResumeUrl = encodeURIComponent(baseParams.resumeUrl);

describe('buildWrapperUrl', () => {
  test('uses the default resume page when no follow-up question is given', () => {
    const url = buildWrapperUrl(baseParams);

    expect(url).toBe(
      `https://app.openops.com/html/resume_execution.html?isTest=false&redirectUrl=${encodedResumeUrl}`,
    );
  });

  test('uses the collect-input page when a follow-up question is given', () => {
    const url = buildWrapperUrl({
      ...baseParams,
      followUp: {
        question: "What is the correct owner's email?",
        answerFormat: 'email',
      },
    });

    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://app.openops.com');
    expect(parsed.pathname).toBe('/html/collect_input.html');
    expect(parsed.searchParams.get('question')).toBe(
      "What is the correct owner's email?",
    );
    expect(parsed.searchParams.get('format')).toBe('email');
    expect(parsed.searchParams.get('isTest')).toBe('false');
    expect(parsed.searchParams.get('redirectUrl')).toBe(baseParams.resumeUrl);
  });

  test('includes the message header as the form title when given', () => {
    const url = buildWrapperUrl({
      ...baseParams,
      followUp: {
        question: 'Who owns this?',
        title: 'Cost savings opportunity: vol-123',
      },
    });

    expect(new URL(url).searchParams.get('title')).toBe(
      'Cost savings opportunity: vol-123',
    );
  });

  test('includes the no-answer option when given', () => {
    const url = buildWrapperUrl({
      ...baseParams,
      followUp: {
        question: "What is the correct owner's email?",
        noAnswerOption: "I don't know the owner",
      },
    });

    expect(new URL(url).searchParams.get('noAnswerOption')).toBe(
      "I don't know the owner",
    );
  });

  test('omits the no-answer option param when not given', () => {
    const url = buildWrapperUrl({
      ...baseParams,
      followUp: { question: 'Why was this dismissed?' },
    });

    expect(new URL(url).searchParams.has('noAnswerOption')).toBe(false);
  });

  test('ignores a follow-up with an empty question', () => {
    const url = buildWrapperUrl({
      ...baseParams,
      followUp: { question: '   ' },
    });

    expect(url).toContain('/html/resume_execution.html?');
  });

  test('defaults the answer format to text for unknown formats', () => {
    const url = buildWrapperUrl({
      ...baseParams,
      followUp: { question: 'Why?', answerFormat: 'dropdown' },
    });

    expect(new URL(url).searchParams.get('format')).toBe('text');
  });

  test('passes isTest through', () => {
    const url = buildWrapperUrl({ ...baseParams, isTest: true });

    expect(url).toContain('isTest=true');
  });
});
