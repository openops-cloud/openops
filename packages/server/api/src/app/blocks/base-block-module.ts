import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  BlockMetadata,
  BlockMetadataModel,
  BlockMetadataModelSummary,
} from '@openops/blocks-framework';
import {
  ALL_PRINCIPAL_TYPES,
  BlockCategory,
  BlockOptionRequest,
  encodeStepOutputs,
  FlagId,
  flowHelper,
  GetBlockRequestParams,
  GetBlockRequestQuery,
  GetBlockRequestWithScopeParams,
  ListBlocksRequestQuery,
  ListVersionRequestQuery,
  ListVersionsResponse,
  OpenOpsId,
  OpsEdition,
  PrincipalType,
} from '@openops/shared';
import { engineRunner } from 'server-worker';
import { accessTokenManager } from '../authentication/lib/access-token-manager';
import { devFlagsService } from '../flags/dev-flags.service';
import { flagService } from '../flags/flag.service';
import { flowService } from '../flows/flow/flow.service';
import { flowStepTestOutputService } from '../flows/step-test-output/flow-step-test-output.service';
import {
  blockMetadataService,
  getBlockPackage,
} from './block-metadata-service';
import { blockSyncService } from './block-sync-service';

export const blockModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(baseBlocksController, { prefix: '/v1/blocks' });
};

const baseBlocksController: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/versions',
    ListVersionsRequest,
    async (req): Promise<ListVersionsResponse> => {
      return blockMetadataService.getVersions({
        name: req.query.name,
        projectId:
          req.principal.type === PrincipalType.UNKNOWN
            ? undefined
            : req.principal.projectId,
        release: req.query.release,
        edition: req.query.edition ?? OpsEdition.COMMUNITY,
        organizationId:
          req.principal.type === PrincipalType.UNKNOWN
            ? undefined
            : req.principal.organization.id,
      });
    },
  );

  app.get(
    '/categories',
    ListCategoriesRequest,
    async (): Promise<BlockCategory[]> => {
      return Object.values(BlockCategory);
    },
  );

  app.get(
    '/',
    ListBlocksRequest,
    async (req): Promise<BlockMetadataModelSummary[]> => {
      const latestRelease = await flagService.getCurrentRelease();
      const release = req.query.release ?? latestRelease;
      const edition = req.query.edition ?? OpsEdition.COMMUNITY;
      const organizationId =
        req.principal.type === PrincipalType.UNKNOWN
          ? undefined
          : req.principal.organization.id;
      const projectId =
        req.principal.type === PrincipalType.UNKNOWN
          ? undefined
          : req.principal.projectId;
      const blockMetadataSummary = await blockMetadataService.list({
        release,
        includeHidden: req.query.includeHidden ?? false,
        projectId,
        organizationId,
        edition,
        categories: req.query.categories,
        searchQuery: req.query.searchQuery,
        sortBy: req.query.sortBy,
        orderBy: req.query.orderBy,
        suggestionType: req.query.suggestionType,
      });
      return blockMetadataSummary;
    },
  );

  app.get(
    '/:scope/:name',
    GetBlockParamsWithScopeRequest,
    async (req): Promise<BlockMetadata> => {
      const { name, scope } = req.params;
      const { version } = req.query;

      const decodeScope = decodeURIComponent(scope);
      const decodedName = decodeURIComponent(name);
      const projectId =
        req.principal.type === PrincipalType.UNKNOWN
          ? undefined
          : req.principal.projectId;
      return blockMetadataService.getOrThrow({
        projectId,
        name: `${decodeScope}/${decodedName}`,
        version,
      });
    },
  );

  app.get(
    '/:name',
    GetBlockParamsRequest,
    async (req): Promise<BlockMetadataModel> => {
      const { name } = req.params;
      const { version } = req.query;

      const decodedName = decodeURIComponent(name);
      const projectId =
        req.principal.type === PrincipalType.UNKNOWN
          ? undefined
          : req.principal.projectId;
      return blockMetadataService.getOrThrow({
        projectId,
        name: decodedName,
        version,
      });
    },
  );

  app.post('/options', OptionsBlockRequest, async (req) => {
    const request = req.body;
    const { projectId } = req.principal;
    const flow = await flowService.getOnePopulatedOrThrow({
      projectId,
      id: request.flowId,
      versionId: request.flowVersionId,
    });
    const engineToken = await accessTokenManager.generateEngineToken({
      projectId,
    });

    let stepTestOutputs: Record<OpenOpsId, string> | undefined = undefined;
    const featureFlag = await devFlagsService.getOne(
      FlagId.USE_NEW_EXTERNAL_TESTDATA,
    );
    if (featureFlag?.value) {
      const stepIds = flowHelper.getAllStepIds(flow.version.trigger);
      const outputs = await flowStepTestOutputService.listEncrypted({
        flowVersionId: request.flowVersionId,
        stepIds,
      });

      stepTestOutputs = encodeStepOutputs(outputs);
    }

    const { result } = await engineRunner.executeProp(engineToken, {
      block: await getBlockPackage(projectId, request),
      flowVersion: flow.version,
      propertyName: request.propertyName,
      actionOrTriggerName: request.actionOrTriggerName,
      input: request.input,
      projectId,
      searchValue: request.searchValue,
      stepTestOutputs,
    });

    return result;
  });

  app.delete('/:id', DeleteBlockRequest, async (req): Promise<void> => {
    return blockMetadataService.delete({
      projectId: req.principal.projectId,
      id: req.params.id,
    });
  });
};

const ListBlocksRequest = {
  config: {
    allowedPrincipals: ALL_PRINCIPAL_TYPES,
  },
  schema: {
    querystring: ListBlocksRequestQuery,
    description:
      'List all available blocks with filtering and sorting options. This endpoint retrieves a paginated list of blocks that can be used in flows, including both official and custom blocks. Supports filtering by release version, tags, categories, and block type.',
  },
};

const GetBlockParamsRequest = {
  config: {
    allowedPrincipals: ALL_PRINCIPAL_TYPES,
  },
  schema: {
    description:
      'Retrieve detailed information about a specific block by its name. This endpoint returns the complete block metadata including its configuration, actions, triggers, and properties. Optionally specify a version to get historical block data or check compatibility.',
    params: GetBlockRequestParams,
    querystring: GetBlockRequestQuery,
  },
};

const GetBlockParamsWithScopeRequest = {
  config: {
    allowedPrincipals: ALL_PRINCIPAL_TYPES,
  },
  schema: {
    description:
      'Retrieve detailed information about a scoped block (e.g., custom blocks). This endpoint returns the complete block metadata for blocks that belong to a specific scope or namespace. Useful for accessing custom blocks or blocks from specific organizations.',
    params: GetBlockRequestWithScopeParams,
    querystring: GetBlockRequestQuery,
  },
};

const ListCategoriesRequest = {
  config: {
    allowedPrincipals: ALL_PRINCIPAL_TYPES,
  },
  schema: {
    description:
      'Retrieve all available block categories with filtering options. This endpoint returns a list of predefined categories that can be used to organize and filter blocks in the system. Supports filtering by release version, edition, and block type.',
    querystring: ListBlocksRequestQuery,
  },
};

const OptionsBlockRequest = {
  schema: {
    description:
      'Execute a block option or property to retrieve dynamic configuration options. This endpoint is used to fetch dynamic values, validate inputs, or get suggestions based on the current block configuration and flow context. Essential for building dynamic block configurations.',
    body: BlockOptionRequest,
  },
};

const DeleteBlockRequest = {
  schema: {
    description:
      'Delete a custom block from the system. This endpoint permanently removes a block and its associated metadata. This operation cannot be undone and will affect any flows using this block. Use with caution as it may impact existing flows.',
    params: Type.Object({
      id: Type.String(),
    }),
  },
};

const ListVersionsRequest = {
  config: {
    allowedPrincipals: ALL_PRINCIPAL_TYPES,
  },
  schema: {
    description:
      'Retrieve version history for blocks. This endpoint returns a list of available versions for a specific block, including release information and compatibility details. Useful for tracking block evolution, managing updates, and ensuring compatibility with your flows.',
    querystring: ListVersionRequestQuery,
  },
};
