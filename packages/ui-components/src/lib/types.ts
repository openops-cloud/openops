import { BlockMetadataModelSummary } from '@openops/blocks-framework';
import {
  ActionType,
  BlockType,
  FlowOperationType,
  PackageType,
  StepLocationRelativeToParent,
  TriggerType,
} from '@openops/shared';

type BaseStepMetadata = {
  displayName: string;
  logoUrl: string;
  description: string;
};

export type BlockStepMetadata = BaseStepMetadata & {
  type: ActionType.BLOCK | TriggerType.BLOCK;
  blockName: string;
  blockVersion: string;
  categories: string[];
  packageType: PackageType;
  blockType: BlockType;
};

export type PrimitiveStepMetadata = BaseStepMetadata & {
  type: Omit<ActionType | TriggerType, ActionType.BLOCK | TriggerType.BLOCK>;
};

export type BlockStepMetadataWithSuggestions = BlockStepMetadata &
  Pick<BlockMetadataModelSummary, 'suggestedActions' | 'suggestedTriggers'>;

export type StepMetadataWithSuggestions =
  | BlockStepMetadataWithSuggestions
  | PrimitiveStepMetadata;

export type StepMetadata = BlockStepMetadata | PrimitiveStepMetadata;

export type StepTemplateMetadata = {
  displayName: string;
  description: string;
};

export type ItemListMetadata = {
  name: string;
  displayName: string;
  description: string;
};

export type BlockSelectorOperation =
  | {
      type: FlowOperationType.ADD_ACTION;
      actionLocation: {
        parentStep: string;
        stepLocationRelativeToParent: StepLocationRelativeToParent;
        branchNodeId?: string;
      };
    }
  | { type: FlowOperationType.UPDATE_TRIGGER }
  | {
      type: FlowOperationType.UPDATE_ACTION;
      stepName: string;
    };

export type HandleSelectCallback = (
  block: StepMetadata | undefined,
  item: ItemListMetadata,
) => void;
