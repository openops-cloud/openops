import { fileBlocksUtils } from '@openops/server-shared';
import {
  ActionType,
  flowHelper,
  FlowOperationRequest,
  FlowOperationType,
  TestRunLimitSettings,
  Trigger,
} from '@openops/shared';

export function shouldRecalculateTestRunActionLimits(
  operation: FlowOperationRequest,
): boolean {
  if (
    operation.type === FlowOperationType.ADD_ACTION ||
    operation.type === FlowOperationType.DELETE_ACTION ||
    operation.type === FlowOperationType.UPDATE_ACTION ||
    operation.type === FlowOperationType.DUPLICATE_ACTION ||
    operation.type === FlowOperationType.PASTE_ACTIONS ||
    operation.type === FlowOperationType.IMPORT_FLOW ||
    operation.type === FlowOperationType.USE_AS_DRAFT
  ) {
    return true;
  }

  return false;
}

export async function tryIncrementalUpdateForAddAction(
  currentLimits: TestRunLimitSettings,
  operation: FlowOperationRequest,
): Promise<TestRunLimitSettings | null> {
  if (operation.type !== FlowOperationType.ADD_ACTION) {
    return null;
  }

  const { action } = operation.request;
  if (action.type !== ActionType.BLOCK) {
    return currentLimits;
  }

  const blockName = action.settings?.blockName as string | undefined;
  const actionName = action.settings?.actionName as string | undefined;

  if (!blockName || !actionName) {
    return currentLimits;
  }

  const existingLimit = currentLimits.limits.find(
    (limit) => limit.blockName === blockName && limit.actionName === actionName,
  );

  if (existingLimit) {
    return currentLimits;
  }

  const isWriteAction = await checkIfWriteAction(blockName, actionName);
  if (!isWriteAction) {
    return currentLimits;
  }

  return {
    ...currentLimits,
    limits: [
      ...currentLimits.limits,
      {
        blockName,
        actionName,
        isEnabled: true,
        limit: 10,
      },
    ],
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
  const uniquePairs = new Set<string>();
  const limits: TestRunLimitSettings['limits'] = [];

  for (const step of steps) {
    if (step?.type !== ActionType.BLOCK) {
      continue;
    }

    const settings = step.settings ?? {};
    const blockName = settings.blockName as string | undefined;
    const actionName = settings.actionName as string | undefined;

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
      if ((action as { isWriteAction?: boolean }).isWriteAction) {
        if (!writeActionsMap.has(block.name)) {
          writeActionsMap.set(block.name, new Set());
        }
        writeActionsMap.get(block.name)?.add(actionName);
      }
    }
  }

  return writeActionsMap;
}

async function checkIfWriteAction(
  blockName: string,
  actionName: string,
): Promise<boolean> {
  const allBlocks = await fileBlocksUtils.findAllBlocks();
  const block = allBlocks.find((b) => b.name === blockName);

  if (!block) {
    return false;
  }

  const actions =
    (block as { actions?: Record<string, unknown> }).actions || {};
  const action = actions[actionName] as { isWriteAction?: boolean } | undefined;

  return action?.isWriteAction === true;
}
