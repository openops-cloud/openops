import { api } from '@/app/lib/api';
import {
  BlockMetadataModel,
  BlockMetadataModelSummary,
  BlockPropertyMap,
  DropdownState,
} from '@openops/blocks-framework';
import {
  Action,
  ActionType,
  AddBlockRequestBody,
  BlockOptionRequest,
  BlockScope,
  EngineErrorResponse,
  GetBlockRequestParams,
  GetBlockRequestQuery,
  ListBlocksRequestQuery,
  PackageType,
  Trigger,
  TriggerType,
} from '@openops/shared';

import {
  BlockStepMetadata,
  PRIMITIVE_STEP_METADATA,
  StepMetadata,
} from '@openops/components/ui';

export const blocksApi = {
  list(request: ListBlocksRequestQuery): Promise<BlockMetadataModelSummary[]> {
    return api.get<BlockMetadataModelSummary[]>('/v1/blocks', request);
  },
  get(
    request: GetBlockRequestParams & GetBlockRequestQuery,
  ): Promise<BlockMetadataModel> {
    return api.get<BlockMetadataModel>(`/v1/blocks/${request.name}`, {
      version: request.version ?? undefined,
    });
  },
  options<
    T extends DropdownState<unknown> | BlockPropertyMap | EngineErrorResponse,
  >(request: BlockOptionRequest): Promise<T> {
    return api.post<T>(`/v1/blocks/options`, request);
  },
  mapToMetadata(
    type: 'action' | 'trigger',
    block: BlockMetadataModelSummary | BlockMetadataModel,
  ): BlockStepMetadata {
    return {
      displayName: block.displayName,
      logoUrl: block.logoUrl,
      displayIcon: block.displayIcon,
      description: block.description,
      type: type === 'action' ? ActionType.BLOCK : TriggerType.BLOCK,
      blockType: block.blockType,
      blockName: block.name,
      blockVersion: block.version,
      categories: block.categories ?? [],
      packageType: block.packageType,
    };
  },
  mapToSuggestions(
    block: BlockMetadataModelSummary,
  ): Pick<BlockMetadataModelSummary, 'suggestedActions' | 'suggestedTriggers'> {
    return {
      suggestedActions: block.suggestedActions,
      suggestedTriggers: block.suggestedTriggers,
    };
  },
  async getMetadata(step: Action | Trigger): Promise<StepMetadata> {
    switch (step.type) {
      case ActionType.BRANCH:
      case ActionType.SPLIT:
      case ActionType.LOOP_ON_ITEMS:
      case ActionType.CODE:
      case TriggerType.EMPTY:
        return PRIMITIVE_STEP_METADATA[step.type];
      case ActionType.BLOCK:
      case TriggerType.BLOCK: {
        const { blockName, blockVersion } = step.settings;
        const block = await blocksApi.get({
          name: blockName,
          version: blockVersion,
        });
        return blocksApi.mapToMetadata(
          step.type === ActionType.BLOCK ? 'action' : 'trigger',
          block,
        );
      }
    }
  },
  install(params: AddBlockRequestBody) {
    const formData = new FormData();
    formData.set('packageType', params.packageType);
    formData.set('blockName', params.blockName);
    formData.set('blockVersion', params.blockVersion);
    formData.set('scope', BlockScope.PROJECT);
    if (params.packageType === PackageType.ARCHIVE) {
      formData.set('blockArchive', params.blockArchive as any);
    }
    return api.post<BlockMetadataModel>(`/v1/blocks`, params);
  },
  delete(id: string) {
    return api.delete(`/v1/blocks/${id}`);
  },
};
