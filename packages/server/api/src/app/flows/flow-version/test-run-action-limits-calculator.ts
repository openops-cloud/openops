import { fileBlocksUtils } from '@openops/server-shared';
import {
  ActionType,
  flowHelper,
  TestRunLimit,
  TestRunLimitSettings,
  Trigger,
} from '@openops/shared';

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
