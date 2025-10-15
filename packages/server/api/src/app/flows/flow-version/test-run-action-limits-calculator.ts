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

let writeActionsMapCache: Map<string, Set<string>> | null = null;

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
  switch (operation.type) {
    case FlowOperationType.ADD_ACTION: {
      const action = operation.request.action as Action;
      return addLimitForActionIfNeeded(currentLimits, action);
    }
    case FlowOperationType.DELETE_ACTION: {
      return removeLimitForAction(currentLimits, oldAction);
    }
    case FlowOperationType.UPDATE_ACTION: {
      return updateLimitForAction(
        currentLimits,
        operation.request as Action,
        oldAction,
      );
    }
    case FlowOperationType.DUPLICATE_ACTION: {
      return addLimitForActionIfNeeded(currentLimits, oldAction);
    }
    default: {
      return null;
    }
  }
}

function extractBlockInfo(
  action?: Action,
): { blockName: string; actionName: string } | null {
  if (!action || action.type !== ActionType.BLOCK) {
    return null;
  }

  const blockName = action.settings?.blockName as string | undefined;
  const actionName = action.settings?.actionName as string | undefined;

  if (!blockName || !actionName) {
    return null;
  }

  return { blockName, actionName };
}

function removeLimitByKey(
  limits: TestRunLimitSettings['limits'],
  blockName: string,
  actionName: string,
): TestRunLimitSettings['limits'] {
  return limits.filter(
    (limit) =>
      !(limit.blockName === blockName && limit.actionName === actionName),
  );
}

async function addLimitForActionIfNeeded(
  currentLimits: TestRunLimitSettings,
  action?: Action,
): Promise<TestRunLimitSettings> {
  const blockInfo = extractBlockInfo(action);
  if (!blockInfo) {
    return currentLimits;
  }

  const { blockName, actionName } = blockInfo;

  if (
    currentLimits.limits.some(
      (limit) =>
        limit.blockName === blockName && limit.actionName === actionName,
    )
  ) {
    return currentLimits;
  }

  const writeActionsMap = await buildWriteActionsMap();
  if (!writeActionsMap.get(blockName)?.has(actionName)) {
    return currentLimits;
  }

  return {
    ...currentLimits,
    limits: [
      ...currentLimits.limits,
      { blockName, actionName, isEnabled: true, limit: DEFAULT_TEST_RUN_LIMIT },
    ],
  };
}

function removeLimitForAction(
  currentLimits: TestRunLimitSettings,
  action?: Action,
): TestRunLimitSettings {
  const blockInfo = extractBlockInfo(action);
  if (!blockInfo) {
    return currentLimits;
  }

  return {
    ...currentLimits,
    limits: removeLimitByKey(
      currentLimits.limits,
      blockInfo.blockName,
      blockInfo.actionName,
    ),
  };
}

async function updateLimitForAction(
  currentLimits: TestRunLimitSettings,
  newAction: Action,
  oldAction?: Action,
): Promise<TestRunLimitSettings | null> {
  const oldInfo = extractBlockInfo(oldAction);
  const newInfo = extractBlockInfo(newAction);
  if (!oldInfo || !newInfo) {
    return null;
  }
  if (
    oldInfo.blockName === newInfo.blockName &&
    oldInfo.actionName === newInfo.actionName
  ) {
    return currentLimits;
  }

  const withoutOld = removeLimitByKey(
    currentLimits.limits,
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
      return {
        ...currentLimits,
        limits: [
          ...withoutOld,
          {
            blockName: newInfo.blockName,
            actionName: newInfo.actionName,
            isEnabled: true,
            limit: DEFAULT_TEST_RUN_LIMIT,
          },
        ],
      };
    }
  }

  return {
    ...currentLimits,
    limits: withoutOld,
  };
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
  const seen = new Set<string>();
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
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    if (writeActionsMap.get(blockName)?.has(actionName)) {
      limits.push({
        blockName,
        actionName,
        isEnabled: true,
        limit: DEFAULT_TEST_RUN_LIMIT,
      });
    }
  }

  return {
    isEnabled: true,
    limits,
  };
}

async function buildWriteActionsMap(): Promise<Map<string, Set<string>>> {
  if (writeActionsMapCache) {
    return writeActionsMapCache;
  }

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

  writeActionsMapCache = writeActionsMap;
  return writeActionsMap;
}
