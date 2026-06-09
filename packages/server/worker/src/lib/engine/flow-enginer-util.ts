import {
  Action,
  ActionType,
  assertEqual,
  BlockActionSettings,
  BlockPackage,
  BlockTriggerSettings,
  BlockType,
  EXACT_VERSION_REGEX,
  flowHelper,
  FlowVersion,
  PackageType,
  Trigger,
  TriggerType,
} from '@openops/shared';
import { engineApiService } from '../api/server-api.service';

type ExtractFlowBlocksParams = {
  flowVersion: FlowVersion;
  engineToken: string;
};

export const blockEngineUtil = {
  async extractFlowBlocks({
    flowVersion,
    engineToken,
  }: ExtractFlowBlocksParams): Promise<BlockPackage[]> {
    const steps = flowHelper.getAllSteps(flowVersion.trigger);
    const blocks = steps
      .filter(
        (step) =>
          step.type === TriggerType.BLOCK || step.type === ActionType.BLOCK,
      )
      .map((step) => {
        const { packageType, blockType, blockName, blockVersion } =
          step.settings as BlockTriggerSettings | BlockActionSettings;
        return blockEngineUtil.getExactBlockVersion(engineToken, {
          packageType,
          blockType,
          blockName,
          blockVersion,
        });
      });
    return Promise.all(blocks);
  },
  async getTriggerBlock(
    engineToken: string,
    flowVersion: FlowVersion,
  ): Promise<BlockPackage> {
    assertEqual(
      flowVersion.trigger.type,
      TriggerType.BLOCK,
      'trigger.type',
      'BLOCK',
    );
    const { trigger } = flowVersion;
    return this.getExactBlockForStep(engineToken, trigger);
  },

  async getExactBlockVersion(
    engineToken: string,
    block: BasicBlockInformation,
  ): Promise<BlockPackage> {
    const { blockName, blockVersion, blockType, packageType } = block;

    switch (packageType) {
      case PackageType.ARCHIVE: {
        const blockMetadata = await engineApiService(engineToken).getBlock(
          blockName,
          {
            version: blockVersion,
          },
        );
        const archive = await engineApiService(engineToken).getFile(
          blockMetadata.archiveId!,
        );

        return {
          packageType,
          blockType,
          blockName,
          blockVersion: blockMetadata.version,
          archiveId: blockMetadata.archiveId!,
          archive,
        };
      }
      case PackageType.REGISTRY: {
        const exactVersion = EXACT_VERSION_REGEX.test(blockVersion);
        const version = exactVersion
          ? blockVersion
          : (
              await engineApiService(engineToken).getBlock(blockName, {
                version: blockVersion,
              })
            ).version;
        return {
          packageType,
          blockType,
          blockName,
          blockVersion: version,
        };
      }
    }
  },
  async getExactBlockForStep(
    engineToken: string,
    step: Action | Trigger,
  ): Promise<BlockPackage> {
    const blockSettings = step.settings as
      | BlockTriggerSettings
      | BlockActionSettings;
    const { blockName, blockVersion, blockType, packageType } = blockSettings;
    return this.getExactBlockVersion(engineToken, {
      blockName,
      blockVersion,
      blockType,
      packageType,
    });
  },
  async lockBlockInFlowVersion({
    engineToken,
    flowVersion,
    stepName,
  }: {
    engineToken: string;
    flowVersion: FlowVersion;
    stepName: string;
  }): Promise<FlowVersion> {
    return flowHelper.transferFlowAsync(flowVersion, async (step) => {
      if (step.name !== stepName) {
        return step;
      }
      if (step.type === TriggerType.BLOCK) {
        const block = await blockEngineUtil.getExactBlockForStep(
          engineToken,
          step,
        );
        return {
          ...step,
          settings: {
            ...step.settings,
            blockVersion: block.blockVersion,
          },
        };
      }
      if (step.type === ActionType.BLOCK) {
        const block = await blockEngineUtil.getExactBlockForStep(
          engineToken,
          step,
        );
        return {
          ...step,
          settings: {
            ...step.settings,
            blockVersion: block.blockVersion,
          },
        };
      }
      return step;
    });
  },
};

export type BasicBlockInformation = {
  blockName: string;
  blockVersion: string;
  blockType: BlockType;
  packageType: PackageType;
};
