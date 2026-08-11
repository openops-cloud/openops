import { StoreScope } from '@openops/blocks-framework';
import {
  InteractionPayload,
  TeamsMessageAction,
  TeamsMessageButton,
} from './generate-message-with-buttons';

// Query params the resume mechanism uses for routing; everything else is
// user-provided data (e.g. from a form wrapper page) surfaced as `parameters`.
const EXCLUDED_RESUME_PARAMS = new Set([
  'button',
  'path',
  'executionCorrelationId',
  'isTest',
  '__proto__',
  'constructor',
  'prototype',
]);

export const onActionReceived = async ({
  messageObj,
  actions,
  context,
}: {
  messageObj: any;
  actions: TeamsMessageButton[];
  context: any;
}) => {
  const resumePayload = context.resumePayload?.queryParams as unknown as
    (InteractionPayload & Record<string, string>) | undefined;
  const isResumedDueToButtonClicked = !!resumePayload?.button;

  if (!isResumedDueToButtonClicked) {
    return {
      action: '',
      isExpired: true,
      message: messageObj,
      parameters: {},
    };
  }

  const isResumeForAButtonOnThisMessage =
    resumePayload?.['path'] === context.currentExecutionPath &&
    actions.find(
      (a: TeamsMessageAction) => a.buttonText === resumePayload.button,
    );

  if (!isResumeForAButtonOnThisMessage) {
    const pauseMetadata = await context.store.get(
      `pauseMetadata_${context.currentExecutionPath}`,
      StoreScope.FLOW_RUN,
    );

    if (!pauseMetadata) {
      throw new Error(
        'Could not fetch pause metadata: ' + context.currentExecutionPath,
      );
    }

    context.run.pause({
      pauseMetadata: pauseMetadata,
    });

    return {
      action: '',
      isExpired: undefined,
      message: messageObj,
      parameters: {},
    };
  }

  const parameters = Object.fromEntries(
    Object.entries(resumePayload).filter(
      ([key]) => !EXCLUDED_RESUME_PARAMS.has(key),
    ),
  );

  return {
    action: resumePayload.button,
    message: messageObj,
    isExpired: false,
    parameters,
  };
};
