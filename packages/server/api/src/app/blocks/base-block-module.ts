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

  app.post('/sync', SyncBlocksRequest, async (): Promise<void> => {
    await blockSyncService.sync();
  });

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
    if (featureFlag && featureFlag.value) {
      const stepIds = flowHelper
        .getAllSteps(flow.version.trigger)
        .filter((step) => step.id !== undefined)
        .map((step) => step.id as string);

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
  },
};
const GetBlockParamsRequest = {
  config: {
    allowedPrincipals: ALL_PRINCIPAL_TYPES,
  },
  schema: {
    params: GetBlockRequestParams,
    querystring: GetBlockRequestQuery,
  },
};

const GetBlockParamsWithScopeRequest = {
  config: {
    allowedPrincipals: ALL_PRINCIPAL_TYPES,
  },
  schema: {
    params: GetBlockRequestWithScopeParams,
    querystring: GetBlockRequestQuery,
  },
};

const ListCategoriesRequest = {
  config: {
    allowedPrincipals: ALL_PRINCIPAL_TYPES,
  },
  schema: {
    querystring: ListBlocksRequestQuery,
  },
};

const OptionsBlockRequest = {
  schema: {
    body: BlockOptionRequest,
  },
};
const DeleteBlockRequest = {
  schema: {
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
    querystring: ListVersionRequestQuery,
  },
};

const SyncBlocksRequest = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
  },
};
