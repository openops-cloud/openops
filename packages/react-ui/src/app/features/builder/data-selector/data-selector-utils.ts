import { formatUtils } from '@/app/lib/utils';
import {
  Action,
  isEmpty,
  isNil,
  StepOutputWithData,
  StepWithIndex,
  Trigger,
} from '@openops/shared';

export type MentionTreeNode = {
  key: string;
  data: {
    propertyPath: string;
    displayName: string;
    value?: string | unknown;
    isSlice?: boolean;
    isTestStepNode?: boolean;
  };
  children?: MentionTreeNode[];
};

type HandleStepOutputProps = {
  stepOutput: unknown;
  propertyPath: string;
  displayName: string;
};

function traverseStepOutputAndReturnMentionTree({
  stepOutput,
  propertyPath,
  displayName,
}: HandleStepOutputProps): MentionTreeNode {
  if (Array.isArray(stepOutput)) {
    return handlingArrayStepOutput(stepOutput, propertyPath, displayName);
  }
  const isObject = stepOutput && typeof stepOutput === 'object';
  if (isObject) {
    return handleObjectStepOutput(propertyPath, displayName, stepOutput);
  }
  return {
    key: propertyPath,
    data: {
      propertyPath,
      displayName,
      value: formatUtils.formatStepInputOrOutput(stepOutput),
    },
    children: undefined,
  };
}

function handlingArrayStepOutput(
  stepOutput: unknown[],
  path: string,
  parentDisplayName: string,
  startingIndex = 0,
): MentionTreeNode {
  const maxSliceLength = 100;
  const isEmptyList = Object.keys(stepOutput).length === 0;
  if (stepOutput.length <= maxSliceLength) {
    return {
      key: parentDisplayName,
      children: stepOutput.map((ouput, idx) =>
        traverseStepOutputAndReturnMentionTree({
          stepOutput: ouput,
          propertyPath: `${path}[${idx + startingIndex}]`,
          displayName: `${parentDisplayName} [${idx + startingIndex + 1}]`,
        }),
      ),
      data: {
        propertyPath: path,
        displayName: parentDisplayName,
        value: isEmptyList ? 'Empty List' : undefined,
      },
    };
  }

  const numberOfSlices = new Array(
    Math.ceil(stepOutput.length / maxSliceLength),
  ).fill(0);
  const children: MentionTreeNode[] = numberOfSlices.map((_, idx) => {
    const startingIndex = idx * maxSliceLength;
    const endingIndex =
      Math.min((idx + 1) * maxSliceLength, stepOutput.length) - 1;
    const displayName = `${parentDisplayName} ${startingIndex}-${endingIndex}`;
    const sliceOutput = handlingArrayStepOutput(
      stepOutput.slice(startingIndex, endingIndex),
      path,
      parentDisplayName,
      startingIndex,
    );
    return {
      ...sliceOutput,
      key: displayName,
      data: {
        ...sliceOutput.data,
        displayName,
        isSlice: true,
      },
    };
  });

  return {
    key: parentDisplayName,
    data: {
      propertyPath: path,
      displayName: parentDisplayName,
      value: stepOutput,
      isSlice: false,
    },
    children: children,
  };
}

function handleObjectStepOutput(
  propertyPath: string,
  displayName: string,
  stepOutput: object,
): MentionTreeNode {
  const isEmptyList = Object.keys(stepOutput).length === 0;
  return {
    key: propertyPath,
    data: {
      propertyPath: propertyPath,
      displayName: displayName,
      value: isEmptyList ? 'Empty List' : undefined,
    },
    children: Object.keys(stepOutput).map((childPropertyKey) => {
      const escapedKey = childPropertyKey.replaceAll(
        /[\\"'\n\r\t’]/g,
        (char) => `\\${char}`,
      );
      return traverseStepOutputAndReturnMentionTree({
        stepOutput: (stepOutput as Record<string, unknown>)[childPropertyKey],
        propertyPath: `${propertyPath}['${escapedKey}']`,
        displayName: childPropertyKey,
      });
    }),
  };
}

const getAllStepsMentions = (
  pathToTargetStep: StepWithIndex[],
  stepsTestOutput: Record<string, StepOutputWithData> | undefined,
) => {
  if (!stepsTestOutput || isEmpty(stepsTestOutput)) {
    return [];
  }

  return pathToTargetStep.map((step) => {
    const displayName = `${step.dfsIndex + 1}. ${step.displayName}`;

    if (!step.id || !stepsTestOutput[step.id]) {
      return createTestNode(step, displayName);
    }

    const stepNeedsTesting = isNil(stepsTestOutput[step.id].lastTestDate);

    if (stepNeedsTesting) {
      return createTestNode(step, displayName);
    }
    return dataSelectorUtils.traverseStepOutputAndReturnMentionTree({
      stepOutput: stepsTestOutput[step.id].output,
      propertyPath: step.name,
      displayName: displayName,
    });
  });
};

const createTestNode = (
  step: Action | Trigger,
  displayName: string,
): MentionTreeNode => {
  return {
    key: step.name,
    data: {
      displayName,
      propertyPath: step.name,
    },
    children: [
      {
        data: {
          displayName: displayName,
          propertyPath: step.name,
          isTestStepNode: true,
        },
        key: `test_${step.name}`,
      },
    ],
  };
};

export const dataSelectorUtils = {
  traverseStepOutputAndReturnMentionTree,
  getAllStepsMentions,
  createTestNode,
};
