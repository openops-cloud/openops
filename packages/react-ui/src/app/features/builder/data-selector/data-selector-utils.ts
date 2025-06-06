import { formatUtils } from '@/app/lib/utils';
import {
  Action,
  flowHelper,
  isEmpty,
  isNil,
  StepOutputWithData,
  StepWithIndex,
  Trigger,
} from '@openops/shared';
import { BuilderState } from '../builder-types';

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
    return traverseStepOutputAndReturnMentionTree({
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
  const sampleData = step.settings?.inputUiInfo?.sampleData;
  const hasSampleData =
    !isNil(sampleData) &&
    (typeof sampleData !== 'object' || Object.keys(sampleData).length > 0);
  if (hasSampleData) {
    return traverseStepOutputAndReturnMentionTree({
      stepOutput: step.settings.inputUiInfo.sampleData,
      propertyPath: step.name,
      displayName: displayName,
    });
  }

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

/**
 * Filters MentionTreeNode arrays by a query string, including recursive logic
 */
function filterBy(arr: MentionTreeNode[], query: string): MentionTreeNode[] {
  if (!query) {
    return arr;
  }

  return arr.reduce((acc, item) => {
    const isTestNodeOrHasNoSampleData =
      !isNil(item.children) && item?.children?.[0]?.data?.isTestStepNode;

    if (isTestNodeOrHasNoSampleData) {
      return acc;
    }

    if (item.children?.length) {
      const filteredChildren = filterBy(item.children, query);
      if (filteredChildren.length) {
        acc.push({ ...item, children: filteredChildren });
        return acc;
      }
    }

    const normalizedValue = item?.data?.value;
    const value = isNil(normalizedValue)
      ? ''
      : JSON.stringify(normalizedValue).toLowerCase();
    const displayName = item?.data?.displayName?.toLowerCase();

    if (
      displayName?.includes(query.toLowerCase()) ||
      value.includes(query.toLowerCase())
    ) {
      acc.push({ ...item, children: undefined });
    }

    return acc;
  }, [] as MentionTreeNode[]);
}

/**
 * Selector that computes the path to the target step using flowHelper.findPathToStep
 */
const getPathToTargetStep = (state: BuilderState) => {
  const { selectedStep, flowVersion } = state;
  if (!selectedStep || !flowVersion?.trigger) {
    return [];
  }
  const pathToTargetStep = flowHelper.findPathToStep({
    targetStepName: selectedStep,
    trigger: flowVersion.trigger,
  });
  return pathToTargetStep;
};

/**
 * @deprecated currentSelectedData will be removed in the future
 * Selector for mapping each step in the path to a MentionTreeNode
 */
const getAllStepsMentionsFromCurrentSelectedData: (
  state: BuilderState,
) => MentionTreeNode[] = (state) => {
  const { selectedStep, flowVersion } = state;
  if (!selectedStep || !flowVersion?.trigger) {
    return [];
  }
  const pathToTargetStep = flowHelper.findPathToStep({
    targetStepName: selectedStep,
    trigger: flowVersion.trigger,
  });

  return pathToTargetStep.map((step) => {
    const stepNeedsTesting = isNil(step.settings.inputUiInfo?.lastTestDate);
    const displayName = `${step.dfsIndex + 1}. ${step.displayName}`;
    if (stepNeedsTesting) {
      return createTestNode(step, displayName);
    }
    return traverseStepOutputAndReturnMentionTree({
      stepOutput: step.settings.inputUiInfo?.currentSelectedData,
      propertyPath: step.name,
      displayName: displayName,
    });
  });
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Map) &&
    !(value instanceof Date)
  );
};

const isAtomicValue = (value: unknown): boolean => {
  return (
    value === null ||
    value === undefined ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    value instanceof Map ||
    value instanceof Date
  );
};

const isEmptyArray = (value: unknown): boolean => {
  return Array.isArray(value) && value.length === 0;
};

type MergedOutput = {
  data: unknown;
  usedSampleData: boolean;
};

/**
 * Merges sample data with test output, with sample data having priority.
 * If both are objects, sample data properties will override test output properties.
 * If test output is not an object, sample data will be used if it exists.
 * Handles nested objects by recursively merging them.
 * Arrays, Maps, and Dates are treated as atomic values - sample data takes precedence.
 * Empty arrays in sample data are replaced with test output arrays.
 * Primitives are treated as atomic values - sample data takes precedence.
 * Returns an object containing the merged data and a flag indicating whether sample data was used.
 */
const mergeSampleDataWithTestOutput = (
  sampleData: unknown,
  testOutput: unknown,
): MergedOutput => {
  // Handle empty arrays in sample data
  if (isEmptyArray(sampleData) && Array.isArray(testOutput)) {
    return {
      data: testOutput,
      usedSampleData: false,
    };
  }

  if (isAtomicValue(sampleData) || isAtomicValue(testOutput)) {
    return {
      data: sampleData ?? testOutput,
      usedSampleData: sampleData !== undefined && sampleData !== null,
    };
  }

  if (isPlainObject(sampleData) && isPlainObject(testOutput)) {
    const result = { ...testOutput };
    let usedSampleData = false;

    Object.entries(sampleData).forEach(([key, value]) => {
      if (isPlainObject(value) && isPlainObject(testOutput[key])) {
        const merged = mergeSampleDataWithTestOutput(value, testOutput[key]);
        result[key] = merged.data;
        usedSampleData = usedSampleData || merged.usedSampleData;
      } else if (isEmptyArray(value) && Array.isArray(testOutput[key])) {
        result[key] = testOutput[key];
        usedSampleData = false;
      } else if (value !== undefined) {
        result[key] = value;
        usedSampleData = true;
      }
    });

    return {
      data: result,
      usedSampleData,
    };
  }

  return {
    data: sampleData ?? testOutput,
    usedSampleData: sampleData !== undefined && sampleData !== null,
  };
};

export const dataSelectorUtils = {
  traverseStepOutputAndReturnMentionTree,
  getAllStepsMentions,
  createTestNode,
  filterBy,
  getPathToTargetStep,
  getAllStepsMentionsFromCurrentSelectedData,
  mergeSampleDataWithTestOutput,
};
