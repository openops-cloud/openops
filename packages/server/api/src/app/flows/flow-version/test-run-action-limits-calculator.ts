import { fileBlocksUtils } from '@openops/server-shared';
import {
  Action,
  ActionType,
  buildBlockActionKey,
  findTestRunLimit,
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
): Promise<TestRunLimitSettings | null> {
  if (operation.type !== FlowOperationType.ADD_ACTION) {
    return null;
  }

  const updatedLimits = await tryAddLimitForAction(
    currentLimits.limits,
    operation.request.action as Action,
  );
  return {
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

async function tryAddLimitForAction(
  limits: TestRunLimit[],
  action?: Action,
): Promise<TestRunLimit[]> {
  const blockInfo = extractBlockInfo(action);
  if (!blockInfo) {
    return limits;
  }

  if (findTestRunLimit(limits, blockInfo.blockName, blockInfo.actionName)) {
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

    const key = buildBlockActionKey(blockName, actionName);
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

export function mergeTestRunLimits(
  previous: TestRunLimitSettings,
  calculated: TestRunLimitSettings,
): TestRunLimitSettings {
  const mergedLimits: TestRunLimit[] = calculated.limits.map((limit) => {
    const existing = findTestRunLimit(
      previous.limits,
      limit.blockName,
      limit.actionName,
    );
    return existing
      ? {
          ...limit,
          isEnabled: existing.isEnabled,
          limit: existing.limit,
        }
      : limit;
  });
  return {
    ...calculated,
    limits: mergedLimits,
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
