import { fileBlocksUtils, logger } from '@openops/server-shared';
import { ActionType, flowHelper, Trigger } from '@openops/shared';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTestRunActionLimitsToFlowVersion1760429290001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info('AddTestRunActionLimitsToFlowVersion1760429290001: starting');

    await queryRunner.query(`
      ALTER TABLE "flow_version"
      ADD COLUMN IF NOT EXISTS "testRunActionLimits" jsonb
    `);

    const writeActionsMap = await this.buildWriteActionsMap();

    const records: Array<{ id: string; trigger: Trigger | null }> =
      await queryRunner.query('SELECT "id", "trigger" FROM "flow_version"');

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const limits = this.calculateLimitsForTrigger(
        record.trigger,
        writeActionsMap,
      );

      await queryRunner.query(
        `UPDATE "flow_version" SET "testRunActionLimits" = $1 WHERE "id" = $2`,
        [JSON.stringify({ isEnabled: true, limits }), record.id],
      );
    }

    logger.info('AddTestRunActionLimitsToFlowVersion1760429290001: completed');
  }

  public async down(): Promise<void> {
    throw new Error('Not implemented');
  }

  private async buildWriteActionsMap(): Promise<Map<string, Set<string>>> {
    const writeActionsMap = new Map<string, Set<string>>();
    const allBlocks = await fileBlocksUtils.findAllBlocks();

    for (const block of allBlocks) {
      const actions =
        (block as unknown as { actions?: Record<string, unknown> }).actions ||
        {};

      for (const [actionName, action] of Object.entries(actions)) {
        const isWrite = (action as { isWriteAction?: boolean })?.isWriteAction;
        if (isWrite === true) {
          if (!writeActionsMap.has(block.name)) {
            writeActionsMap.set(block.name, new Set());
          }
          writeActionsMap.get(block.name)?.add(actionName);
        }
      }
    }

    return writeActionsMap;
  }

  private calculateLimitsForTrigger(
    trigger: Trigger | null,
    writeActionsMap: Map<string, Set<string>>,
  ): Array<{
    blockName: string;
    actionName: string;
    isEnabled: boolean;
    limit: number;
  }> {
    if (!trigger) {
      return [];
    }

    const steps = flowHelper.getAllSteps(trigger);
    const uniquePairs = new Set<string>();
    const limits: Array<{
      blockName: string;
      actionName: string;
      isEnabled: boolean;
      limit: number;
    }> = [];

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

    return limits;
  }
}
