import { Action, Block } from '@openops/blocks-framework';
import {
  ApplicationError,
  ErrorCode,
  ExecutePropsOptions,
  extractBlockFromModule,
  getPackageAliasForBlock,
  isNil,
} from '@openops/shared';

const loadBlockOrThrow = async ({
  blockName,
  blockVersion,
  blocksSource,
}: {
  blockName: string;
  blockVersion: string;
  blocksSource: string;
}): Promise<Block> => {
  const packageName = getPackageAlias({
    blockName,
    blockVersion,
    blocksSource,
  });

  const module = await import(packageName);
  const block = extractBlockFromModule<Block>({
    module,
    blockName,
    blockVersion,
  });

  if (isNil(block)) {
    throw new ApplicationError({
      code: ErrorCode.BLOCK_NOT_FOUND,
      params: {
        blockName,
        blockVersion,
        message: 'Block not found in the engine',
      },
    });
  }

  return block;
};

const getBlockAndActionOrThrow = async (params: {
  blockName: string;
  blockVersion: string;
  actionName: string;
  blocksSource: string;
}): Promise<{ block: Block; blockAction: Action }> => {
  const { blockName, blockVersion, actionName, blocksSource } = params;

  const block = await loadBlockOrThrow({
    blockName,
    blockVersion,
    blocksSource,
  });
  const blockAction = block.getAction(actionName);

  if (isNil(blockAction)) {
    throw new ApplicationError({
      code: ErrorCode.STEP_NOT_FOUND,
      params: {
        blockName,
        blockVersion,
        stepName: actionName,
      },
    });
  }

  return {
    block,
    blockAction,
  };
};

const getPropOrThrow = async ({
  params,
  blocksSource,
}: {
  params: ExecutePropsOptions;
  blocksSource: string;
}) => {
  const { block: blockPackage, actionOrTriggerName, propertyName } = params;

  const block = await loadBlockOrThrow({
    blockName: blockPackage.blockName,
    blockVersion: blockPackage.blockVersion,
    blocksSource,
  });

  const action =
    block.getAction(actionOrTriggerName) ??
    block.getTrigger(actionOrTriggerName);

  if (isNil(action)) {
    throw new ApplicationError({
      code: ErrorCode.STEP_NOT_FOUND,
      params: {
        blockName: blockPackage.blockName,
        blockVersion: blockPackage.blockVersion,
        stepName: actionOrTriggerName,
      },
    });
  }

  const prop = action.props[propertyName];

  if (isNil(prop)) {
    throw new ApplicationError({
      code: ErrorCode.CONFIG_NOT_FOUND,
      params: {
        blockName: blockPackage.blockName,
        blockVersion: blockPackage.blockVersion,
        stepName: actionOrTriggerName,
        configName: propertyName,
      },
    });
  }

  return prop;
};

const getPackageAlias = ({
  blockName,
  blockVersion,
  blocksSource,
}: {
  blockName: string;
  blocksSource: string;
  blockVersion: string;
}) => {
  if (blocksSource.trim() === 'FILE') {
    return blockName;
  }

  return getPackageAliasForBlock({
    blockName,
    blockVersion,
  });
};

export const blockLoader = {
  loadBlockOrThrow,
  getBlockAndActionOrThrow,
  getPropOrThrow,
};
