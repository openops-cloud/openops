import {
  Check,
  CircleCheck,
  CircleX,
  PauseCircleIcon,
  PauseIcon,
  Timer,
  X,
} from 'lucide-react';

import {
  Action,
  ActionType,
  flowHelper,
  FlowRun,
  FlowRunStatus,
  FlowVersion,
  LoopStepOutput,
  LoopStepResult,
  StepOutput,
  StepOutputStatus,
  Trigger,
} from '@openops/shared';
import { t } from 'i18next';

export const flowRunUtils = {
  findFailedStep,
  findLoopsState,
  extractStepOutput,
  extractLoopItemStepOutput,
  hasRunFinished,
  getStatusIconForStep(stepOutput: StepOutputStatus): {
    variant: 'default' | 'success' | 'error';
    Icon:
      | typeof Timer
      | typeof CircleCheck
      | typeof PauseCircleIcon
      | typeof CircleX;
  } {
    switch (stepOutput) {
      case StepOutputStatus.RUNNING:
        return {
          variant: 'default',
          Icon: Timer,
        };
      case StepOutputStatus.PAUSED:
        return {
          variant: 'default',
          Icon: PauseCircleIcon,
        };
      case StepOutputStatus.STOPPED:
      case StepOutputStatus.SUCCEEDED:
        return {
          variant: 'success',
          Icon: CircleCheck,
        };
      case StepOutputStatus.FAILED:
        return {
          variant: 'error',
          Icon: CircleX,
        };
    }
  },
  getStatusIcon(status: FlowRunStatus): {
    variant: 'default' | 'success' | 'error';
    Icon: typeof Timer | typeof Check | typeof PauseIcon | typeof X;
  } {
    switch (status) {
      case FlowRunStatus.RUNNING:
        return {
          variant: 'default',
          Icon: Timer,
        };
      case FlowRunStatus.SUCCEEDED:
        return {
          variant: 'success',
          Icon: Check,
        };
      case FlowRunStatus.ABORTED:
        return {
          variant: 'success',
          Icon: Check,
        };
      case FlowRunStatus.FAILED:
        return {
          variant: 'error',
          Icon: X,
        };
      case FlowRunStatus.IGNORED:
        return {
          variant: 'default',
          Icon: X,
        };
      case FlowRunStatus.SCHEDULED:
        return {
          variant: 'default',
          Icon: Timer,
        };
      case FlowRunStatus.PAUSED:
        return {
          variant: 'default',
          Icon: PauseIcon,
        };
      case FlowRunStatus.INTERNAL_ERROR:
        return {
          variant: 'error',
          Icon: X,
        };
      case FlowRunStatus.TIMEOUT:
        return {
          variant: 'error',
          Icon: X,
        };
    }
  },
  getStatusExplanation(status: FlowRunStatus): string | undefined {
    if (status === FlowRunStatus.IGNORED) {
      return t('Previous scheduled run is still in progress');
    }
  },
};

type FailedStepInfo = {
  stepName: string;
  loopIndexes: Record<string, number>;
};

const findFailedStepInLoop: (
  loopStepResult: LoopStepResult,
  currentLoopIndexes: Record<string, number>,
  loopName: string,
) => FailedStepInfo | null = (loopStepResult, currentLoopIndexes, loopName) => {
  for (let i = 0; i < loopStepResult.iterations.length; i++) {
    const iteration = loopStepResult.iterations[i];
    const newLoopIndexes = { ...currentLoopIndexes, [loopName]: i };

    for (const [stepName, step] of Object.entries(iteration)) {
      if (step.status === StepOutputStatus.FAILED) {
        return { stepName, loopIndexes: newLoopIndexes };
      }
      if (step.type === ActionType.LOOP_ON_ITEMS && step.output) {
        const nestedFailedStep = findFailedStepInLoop(
          step.output,
          newLoopIndexes,
          stepName,
        );
        if (nestedFailedStep) {
          return nestedFailedStep;
        }
      }
    }
  }
  return null;
};

function findLoopsState(
  flowVersion: FlowVersion,
  run: FlowRun,
  currentLoopsState: Record<string, number>,
) {
  const loops = flowHelper
    .getAllSteps(flowVersion.trigger)
    .filter((s) => s.type === ActionType.LOOP_ON_ITEMS);
  const failedStepInfo = run.steps ? findFailedStep(run) : null;

  const res = loops.reduce((res: Record<string, number>, step) => {
    const loopName = step.name;
    if (failedStepInfo) {
      const isFailedStepParent = flowHelper.isChildOf(
        step,
        failedStepInfo.stepName,
      );
      if (
        isFailedStepParent &&
        failedStepInfo.loopIndexes[loopName] !== undefined
      ) {
        return {
          ...res,
          [loopName]: failedStepInfo.loopIndexes[loopName],
        };
      }
    }
    return {
      ...res,
      [loopName]: currentLoopsState[loopName] ?? 0,
    };
  }, currentLoopsState);

  return res;
}

function findFailedStep(run: FlowRun): FailedStepInfo | null {
  for (const [stepName, step] of Object.entries(run.steps)) {
    if (step.status === StepOutputStatus.FAILED) {
      return { stepName, loopIndexes: {} };
    }
    if (step.type === ActionType.LOOP_ON_ITEMS && step.output) {
      const failedStepInLoop = findFailedStepInLoop(step.output, {}, stepName);
      if (failedStepInLoop) {
        return failedStepInLoop;
      }
    }
  }
  return null;
}

function hasRunFinished(runStatus: FlowRunStatus): boolean {
  return (
    runStatus !== FlowRunStatus.RUNNING && runStatus !== FlowRunStatus.PAUSED
  );
}

function findStepParents(
  stepName: string,
  step: Action | Trigger,
): Action[] | undefined {
  if (step.name === stepName) {
    return [];
  }
  if (step.nextAction) {
    const pathFromNextAction = findStepParents(stepName, step.nextAction);
    if (pathFromNextAction) {
      return pathFromNextAction;
    }
  }
  if (step.type === ActionType.BRANCH) {
    const pathFromTrueBranch = step.onSuccessAction
      ? findStepParents(stepName, step.onSuccessAction)
      : undefined;
    if (pathFromTrueBranch) {
      return [step, ...pathFromTrueBranch];
    }
    const pathFromFalseBranch = step.onFailureAction
      ? findStepParents(stepName, step.onFailureAction)
      : undefined;
    if (pathFromFalseBranch) {
      return [step, ...pathFromFalseBranch];
    }
  }
  if (step.type === ActionType.SPLIT) {
    const pathFromBranches = step.branches
      .map((branch) =>
        branch.nextAction
          ? findStepParents(stepName, branch.nextAction)
          : undefined,
      )
      .find((path) => path !== undefined);

    if (pathFromBranches) {
      return [step, ...pathFromBranches];
    }
  }
  if (step.type === ActionType.LOOP_ON_ITEMS) {
    const pathFromLoop = step.firstLoopAction
      ? findStepParents(stepName, step.firstLoopAction)
      : undefined;
    if (pathFromLoop) {
      return [step, ...pathFromLoop];
    }
  }
  return undefined;
}
function getLoopChildStepOutput(
  parents: Action[],
  loopIndexes: Record<string, number>,
  childName: string,
  output: Record<string, StepOutput>,
): StepOutput | undefined {
  const parentStepsThatAreLoops = parents.filter(
    (p) => p.type === ActionType.LOOP_ON_ITEMS,
  );
  if (parentStepsThatAreLoops.length === 0) return undefined;
  let iterator: LoopStepOutput | undefined = output[
    parentStepsThatAreLoops[0].name
  ] as LoopStepOutput | undefined;
  let index = 0;
  while (index < parentStepsThatAreLoops.length - 1) {
    if (
      iterator?.output &&
      iterator?.output?.iterations[
        loopIndexes[parentStepsThatAreLoops[index].name]
      ]
    ) {
      iterator = iterator?.output?.iterations[
        loopIndexes[parentStepsThatAreLoops[index].name]
      ][parentStepsThatAreLoops[index + 1].name] as LoopStepOutput | undefined;
    }

    index++;
  }
  if (iterator) {
    const directParentOutput =
      iterator.output?.iterations[
        loopIndexes[
          parentStepsThatAreLoops[parentStepsThatAreLoops.length - 1].name
        ]
      ];
    //Could be accessing out of bounds iteration
    if (directParentOutput) {
      return directParentOutput[childName];
    }
  }
  return undefined;
}
function extractStepOutput(
  stepName: string,
  loopIndexes: Record<string, number>,
  output: Record<string, StepOutput>,
  trigger: Trigger,
): StepOutput | undefined {
  const stepOutput = output[stepName];
  if (stepOutput) {
    return stepOutput;
  }
  const parents = findStepParents(stepName, trigger);
  if (parents) {
    return getLoopChildStepOutput(parents, loopIndexes, stepName, output);
  }
  return undefined;
}

function extractLoopItemStepOutput(
  stepName: string,
  loopIndexes: Record<string, number>,
  output: Record<string, StepOutput>,
  trigger: Trigger,
): StepOutput | null | undefined {
  const testData = stepName
    ? extractStepOutput(stepName, loopIndexes, output, trigger)
    : null;

  if (
    !testData ||
    testData.type !== ActionType.LOOP_ON_ITEMS ||
    !testData.output?.index ||
    !testData.input
  ) {
    return testData;
  }

  try {
    return {
      ...testData,
      output: {
        item: (testData.input as { items: any }).items?.[loopIndexes[stepName]],
        index: loopIndexes[stepName] + 1,
      },
    } as StepOutput;
  } catch {
    return testData;
  }
}
