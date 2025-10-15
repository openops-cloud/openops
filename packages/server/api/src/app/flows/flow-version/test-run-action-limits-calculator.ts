import { fileBlocksUtils } from '@openops/server-shared';
import {
  Action,
  ActionType,
  flowHelper,
  FlowOperationRequest,
  FlowOperationType,
  TestRunLimit,
  TestRunLimitSettings,
  Trigger,
} from '@openops/shared';

export const DEFAULT_TEST_RUN_LIMIT = 10;

export function shouldRecalculateTestRunActionLimits(
  operation: FlowOperationRequest,
): boolean {
  return (
    operation.type === FlowOperationType.ADD_ACTION ||
    operation.type === FlowOperationType.DELETE_ACTION ||
    operation.type === FlowOperationType.UPDATE_ACTION ||
    operation.type === FlowOperationType.PASTE_ACTIONS ||
    operation.type === FlowOperationType.IMPORT_FLOW ||
    operation.type === FlowOperationType.USE_AS_DRAFT
  );
}

export async function tryIncrementalUpdate(
  currentLimits: TestRunLimitSettings,
  operation: FlowOperationRequest,
  oldAction?: Action,
): Promise<TestRunLimitSettings | null> {
  let updatedLimits: TestRunLimit[] | null = null;

  switch (operation.type) {
    case FlowOperationType.ADD_ACTION: {
      updatedLimits = await tryAddLimitForAction(
        currentLimits.limits,
        operation.request.action as Action,
      );
      break;
    }
    case FlowOperationType.DELETE_ACTION: {
      updatedLimits = removeLimitForAction(currentLimits.limits, oldAction);
      break;
    }
    case FlowOperationType.UPDATE_ACTION: {
      updatedLimits = await updateLimitForAction(
        currentLimits.limits,
        operation.request as Action,
        oldAction,
      );
      break;
    }
    default: {
      return null;
    }
  }

  return updatedLimits === null
    ? null
    : {
        ...currentLimits,
        limits: updatedLimits,
      };
}

function extractBlockInfo(
  action?: Action,
): { blockName: string; actionName: string } | null {
  if (!action || action.type !== ActionType.BLOCK) {
    return null;
  }

  const blockName = action.settings?.blockName;
  const actionName = action.settings?.actionName;

  if (!blockName || !actionName) {
    return null;
  }

  return { blockName, actionName };
}

function removeLimitByKey(
  limits: TestRunLimit[],
  blockName: string,
  actionName: string,
): TestRunLimit[] {
  return limits.filter(
    (limit) =>
      !(limit.blockName === blockName && limit.actionName === actionName),
  );
}

async function tryAddLimitForAction(
  limits: TestRunLimit[],
  action?: Action,
): Promise<TestRunLimit[]> {
  const blockInfo = extractBlockInfo(action);
  if (!blockInfo) {
    return limits;
  }

  if (
    limits.some(
      (limit) =>
        limit.blockName === blockInfo.blockName &&
        limit.actionName === blockInfo.actionName,
    )
  ) {
    return limits;
  }

  const writeActionsMap = await buildWriteActionsMap();
  if (!writeActionsMap.get(blockInfo.blockName)?.has(blockInfo.actionName)) {
    return limits;
  }

  return [
    ...limits,
    {
      blockName: blockInfo.blockName,
      actionName: blockInfo.actionName,
      isEnabled: true,
      limit: DEFAULT_TEST_RUN_LIMIT,
    },
  ];
}

function removeLimitForAction(
  limits: TestRunLimit[],
  action?: Action,
): TestRunLimit[] {
  const blockInfo = extractBlockInfo(action);
  if (!blockInfo) {
    return limits;
  }

  return removeLimitByKey(limits, blockInfo.blockName, blockInfo.actionName);
}

async function updateLimitForAction(
  limits: TestRunLimit[],
  newAction: Action,
  oldAction?: Action,
): Promise<TestRunLimit[] | null> {
  const oldInfo = extractBlockInfo(oldAction);
  const newInfo = extractBlockInfo(newAction);
  if (!oldInfo || !newInfo) {
    return null;
  }
  if (oldInfo === newInfo) {
    return limits;
  }

  const withoutOld = removeLimitByKey(
    limits,
    oldInfo.blockName,
    oldInfo.actionName,
  );

  const hasNewLimit = withoutOld.some(
    (l) =>
      l.blockName === newInfo.blockName && l.actionName === newInfo.actionName,
  );

  if (!hasNewLimit) {
    const writeActionsMap = await buildWriteActionsMap();
    if (writeActionsMap.get(newInfo.blockName)?.has(newInfo.actionName)) {
      return [
        ...withoutOld,
        {
          blockName: newInfo.blockName,
          actionName: newInfo.actionName,
          isEnabled: true,
          limit: DEFAULT_TEST_RUN_LIMIT,
        },
      ];
    }
  }

  return withoutOld;
}

export async function calculateTestRunActionLimits(
  trigger: Trigger | null,
): Promise<TestRunLimitSettings> {
  if (!trigger) {
    return {
      isEnabled: true,
      limits: [],
    };
  }

  const writeActionsMap = await buildWriteActionsMap();
  const steps = flowHelper.getAllSteps(trigger);
  const uniquePairs = new Set<string>();
  const limits: TestRunLimit[] = [];

  for (const step of steps) {
    if (step?.type !== ActionType.BLOCK) {
      continue;
    }

    const settings = step.settings ?? {};
    const blockName = settings.blockName;
    const actionName = settings.actionName;

    if (!blockName || !actionName) {
      continue;
    }

    const key = `${blockName}|${actionName}`;
    if (uniquePairs.has(key)) {
      continue;
    }

    uniquePairs.add(key);

    const writeActions = writeActionsMap.get(blockName);
    if (writeActions?.has(actionName)) {
      limits.push({
        blockName,
        actionName,
        isEnabled: true,
        limit: 10,
      });
    }
  }

  return {
    isEnabled: true,
    limits,
  };
}

async function buildWriteActionsMap(): Promise<Map<string, Set<string>>> {
  const writeActionsMap = new Map<string, Set<string>>();
  const allBlocks = await fileBlocksUtils.findAllBlocks();

  for (const block of allBlocks) {
    if (!block.actions) {
      continue;
    }

    for (const [actionName, action] of Object.entries(block.actions)) {
      if (action.isWriteAction) {
        if (!writeActionsMap.has(block.name)) {
          writeActionsMap.set(block.name, new Set());
        }
        writeActionsMap.get(block.name)?.add(actionName);
      }
    }
  }

  return writeActionsMap;
}
