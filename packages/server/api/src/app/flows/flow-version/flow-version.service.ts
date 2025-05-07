import { BlockPropertyMap, PropertyType } from '@openops/blocks-framework';
import { logger } from '@openops/server-shared';
import {
  ActionType,
  AppConnectionWithoutSensitiveData,
  ApplicationError,
  BlockActionSettings,
  BlockTriggerSettings,
  BranchActionSettingsWithValidation,
  Cursor,
  DEFAULT_SAMPLE_DATA_SETTINGS,
  ErrorCode,
  flowHelper,
  FlowId,
  FlowOperationRequest,
  FlowOperationType,
  FlowVersion,
  FlowVersionId,
  FlowVersionState,
  ImportFlowRequest,
  isNil,
  LoopOnItemsActionSettingsWithValidation,
  MinimalFlow,
  openOpsId,
  ProjectId,
  sanitizeObjectForPostgresql,
  SeekPage,
  SplitActionSettingsWithValidation,
  Trigger,
  TriggerType,
  UserId,
} from '@openops/shared';
import { TSchema, Type } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import dayjs from 'dayjs';
import { EntityManager } from 'typeorm';
import { blockMetadataService } from '../../blocks/block-metadata-service';
import { repoFactory } from '../../core/db/repo-factory';
import { buildPaginator } from '../../helper/pagination/build-paginator';
import { paginationHelper } from '../../helper/pagination/pagination-utils';
import { FlowVersionEntity } from './flow-version-entity';
import { flowVersionSideEffects } from './flow-version-side-effects';

const branchSettingsValidator = TypeCompiler.Compile(
  BranchActionSettingsWithValidation,
);
const splitSettingsValidator = TypeCompiler.Compile(
  SplitActionSettingsWithValidation,
);
const loopSettingsValidator = TypeCompiler.Compile(
  LoopOnItemsActionSettingsWithValidation,
);
export const flowVersionRepo = repoFactory(FlowVersionEntity);

export const flowVersionService = {
  async lockBlockVersions({
    projectId,
    flowVersion,
    entityManager,
  }: LockBlockVersionsParams): Promise<FlowVersion> {
    if (flowVersion.state === FlowVersionState.LOCKED) {
      return flowVersion;
    }

    return flowHelper.transferFlowAsync(flowVersion, async (step) => {
      const clonedStep = JSON.parse(JSON.stringify(step));
      const stepTypeIsBlock = [ActionType.BLOCK, TriggerType.BLOCK].includes(
        step.type,
      );

      if (stepTypeIsBlock) {
        const blockMetadata = await blockMetadataService.getOrThrow({
          projectId,
          name: step.settings.blockName,
          version: step.settings.blockVersion,
          entityManager,
        });

        clonedStep.settings.blockVersion = blockMetadata.version;
      }

      return clonedStep;
    });
  },

  async applyOperation({
    flowVersion,
    projectId,
    userId,
    userOperation,
    entityManager,
  }: ApplyOperationParams): Promise<FlowVersion> {
    let operations: FlowOperationRequest[] = [];
    let mutatedFlowVersion: FlowVersion = flowVersion;

    switch (userOperation.type) {
      case FlowOperationType.USE_AS_DRAFT: {
        const previousVersion = await flowVersionService.getFlowVersionOrThrow({
          flowId: flowVersion.flowId,
          versionId: userOperation.request.versionId,
          removeConnectionsName: false,
          removeSampleData: false,
        });

        operations = handleImportFlowOperation(flowVersion, previousVersion);
        break;
      }

      case FlowOperationType.IMPORT_FLOW: {
        operations = handleImportFlowOperation(
          flowVersion,
          userOperation.request,
        );
        break;
      }

      case FlowOperationType.LOCK_FLOW: {
        mutatedFlowVersion = await this.lockBlockVersions({
          projectId,
          flowVersion: mutatedFlowVersion,
          entityManager,
        });

        operations = [userOperation];
        break;
      }

      case FlowOperationType.DUPLICATE_ACTION: {
        mutatedFlowVersion = await this.getFlowVersionOrThrow({
          flowId: flowVersion.flowId,
          versionId: flowVersion.id,
        });

        operations = [userOperation];
        break;
      }

      default: {
        operations = [userOperation];
        break;
      }
    }

    for (const operation of operations) {
      mutatedFlowVersion = await applySingleOperation(
        projectId,
        mutatedFlowVersion,
        operation,
      );
    }

    mutatedFlowVersion.updated = dayjs().toISOString();
    if (userId) {
      mutatedFlowVersion.updatedBy = userId;
    }
    return flowVersionRepo(entityManager).save(
      sanitizeObjectForPostgresql(mutatedFlowVersion),
    );
  },

  async updateTrigger(
    flowVersionId: FlowVersionId,
    trigger: Trigger,
    valid: boolean,
    userId: string,
  ): Promise<FlowVersion> {
    const flowVersion = await flowVersionRepo().findOneBy({
      id: flowVersionId,
    });
    if (isNil(flowVersion)) {
      throw new Error('Flow version not found');
    }
    flowVersion.trigger = trigger;
    flowVersion.valid = valid;
    flowVersion.updated = dayjs().toISOString();
    flowVersion.updatedBy = userId;
    return flowVersionRepo().save(sanitizeObjectForPostgresql(flowVersion));
  },

  async getOne(id: FlowVersionId): Promise<FlowVersion | null> {
    if (isNil(id)) {
      return null;
    }
    return flowVersionRepo().findOneBy({
      id,
    });
  },

  async getLatestLockedVersionOrThrow(flowId: FlowId): Promise<FlowVersion> {
    return flowVersionRepo().findOneOrFail({
      where: {
        flowId,
        state: FlowVersionState.LOCKED,
      },
      order: {
        created: 'DESC',
      },
    });
  },
  async getOneOrThrow(id: FlowVersionId): Promise<FlowVersion> {
    const flowVersion = await flowVersionService.getOne(id);

    if (isNil(flowVersion)) {
      throw new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: {
          entityId: id,
          entityType: 'FlowVersion',
        },
      });
    }

    return flowVersion;
  },
  async list({
    cursorRequest,
    limit,
    flowId,
  }: {
    cursorRequest: Cursor | null;
    limit: number;
    flowId: string;
  }): Promise<SeekPage<FlowVersion>> {
    const decodedCursor = paginationHelper.decodeCursor(cursorRequest);
    const paginator = buildPaginator({
      entity: FlowVersionEntity,
      query: {
        limit,
        order: 'DESC',
        afterCursor: decodedCursor.nextCursor,
        beforeCursor: decodedCursor.previousCursor,
      },
    });
    const paginationResult = await paginator.paginate(
      flowVersionRepo()
        .createQueryBuilder('flow_version')
        .leftJoinAndMapOne(
          'flow_version.updatedByUser',
          'user',
          'user',
          'flow_version.updatedBy = "user"."id"',
        )
        .where({
          flowId,
        }),
    );
    return paginationHelper.createPage<FlowVersion>(
      paginationResult.data,
      paginationResult.cursor,
    );
  },
  async getFlowVersionOrThrow({
    flowId,
    versionId,
    removeConnectionsName = false,
    removeSampleData = false,
    entityManager,
  }: GetFlowVersionOrThrowParams): Promise<FlowVersion> {
    const flowVersion: FlowVersion | null = await flowVersionRepo(
      entityManager,
    ).findOne({
      where: {
        flowId,
        id: versionId,
      },
      //This is needed to return draft by default because it is always the latest one
      order: {
        created: 'DESC',
      },
    });

    if (isNil(flowVersion)) {
      throw new ApplicationError({
        code: ErrorCode.ENTITY_NOT_FOUND,
        params: {
          entityId: versionId,
          entityType: 'FlowVersion',
          message: `flowId=${flowId}`,
        },
      });
    }

    return removeSecretsFromFlow(
      flowVersion,
      removeConnectionsName,
      removeSampleData,
    );
  },
  async createEmptyVersion(
    flowId: FlowId,
    request: {
      displayName: string;
      description: string;
    },
  ): Promise<FlowVersion> {
    const flowVersion: NewFlowVersion = {
      id: openOpsId(),
      displayName: request.displayName,
      description: request.description,
      flowId,
      trigger: {
        id: openOpsId(),
        type: TriggerType.EMPTY,
        name: 'trigger',
        settings: {},
        valid: false,
        displayName: 'Select Trigger',
      },
      valid: false,
      state: FlowVersionState.DRAFT,
    };
    return flowVersionRepo().save(flowVersion);
  },

  async getLatestByConnection({
    connectionName,
    projectId,
  }: GetLatestsFlowVersionsByConnectionParams): Promise<MinimalFlow[]> {
    const query = flowVersionRepo()
      .createQueryBuilder('fv')
      .select('fv.flowId, fv.displayName')
      .innerJoin(
        (qb) =>
          qb
            .from('flow_version', 'sub')
            .select('sub.id, sub.flowId, sub.created')
            .where(
              `("sub"."flowId", "sub"."created") IN (SELECT "flowId", MAX("created") FROM "flow_version" GROUP BY "flowId")`,
            ),
        'sub',
        'fv.id = sub.id',
      )
      .innerJoin('flow', 'f', 'f.id = fv.flowId')
      .where(`CAST(fv.trigger AS TEXT) LIKE :search`)
      .andWhere('f.projectId = :projectId')
      .setParameters({
        search: `%{{connections['${connectionName}']}}%`,
        projectId,
      });

    const flowVersions = await query.getRawMany();

    return flowVersions.map((flowVersion) => {
      return { id: flowVersion.flowId, displayName: flowVersion.displayName };
    });
  },
};

async function applySingleOperation(
  projectId: ProjectId,
  flowVersion: FlowVersion,
  operation: FlowOperationRequest,
): Promise<FlowVersion> {
  logger.info(`applying ${operation.type} to ${flowVersion.displayName}`);
  await flowVersionSideEffects.preApplyOperation({
    projectId,
    flowVersion,
    operation,
  });
  operation = await prepareRequest(projectId, operation);
  return flowHelper.apply(flowVersion, operation);
}

async function removeSecretsFromFlow(
  flowVersion: FlowVersion,
  removeConnectionNames: boolean,
  removeSampleData: boolean,
): Promise<FlowVersion> {
  const flowVersionWithArtifacts: FlowVersion = JSON.parse(
    JSON.stringify(flowVersion),
  );
  const steps = flowHelper.getAllSteps(flowVersionWithArtifacts.trigger);
  for (const step of steps) {
    if (removeSampleData) {
      step.settings.inputUiInfo = {
        ...DEFAULT_SAMPLE_DATA_SETTINGS,
        // preserve the customizedInputs because it specifies what properties are dynamic values
        customizedInputs: step.settings?.inputUiInfo?.customizedInputs || {},
      };
    }
    if (removeConnectionNames) {
      step.settings.input = replaceConnections(step.settings.input);
    }
  }
  return flowVersionWithArtifacts;
}

function replaceConnections(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  if (isNil(obj)) {
    return obj;
  }
  const replacedObj: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      replacedObj[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      replacedObj[key] = replaceConnections(value as Record<string, unknown>);
    } else if (typeof value === 'string') {
      const replacedValue = value.replace(/\{{connections\.[^}]*}}/g, '');
      replacedObj[key] = replacedValue === '' ? undefined : replacedValue;
    } else {
      replacedObj[key] = value;
    }
  }
  return replacedObj;
}

function handleImportFlowOperation(
  flowVersion: FlowVersion,
  operation: ImportFlowRequest,
): FlowOperationRequest[] {
  const actionsToRemove = flowHelper
    .getAllStepsAtFirstLevel(flowVersion.trigger)
    .filter((step) => flowHelper.isAction(step.type));
  const operations: FlowOperationRequest[] = actionsToRemove.map((step) => ({
    type: FlowOperationType.DELETE_ACTION,
    request: {
      name: step.name,
    },
  }));
  operations.push({
    type: FlowOperationType.UPDATE_TRIGGER,
    request: operation.trigger,
  });
  operations.push({
    type: FlowOperationType.CHANGE_NAME,
    request: {
      displayName: operation.displayName,
    },
  });
  operations.push({
    type: FlowOperationType.CHANGE_DESCRIPTION,
    request: {
      description: operation.description ?? '',
    },
  });

  operations.push(
    ...flowHelper.getImportOperations(
      operation.trigger,
      operation.connections as AppConnectionWithoutSensitiveData[],
    ),
  );
  return operations;
}

async function prepareRequest(
  projectId: ProjectId,
  request: FlowOperationRequest,
): Promise<FlowOperationRequest> {
  const clonedRequest: FlowOperationRequest = JSON.parse(
    JSON.stringify(request),
  );
  switch (clonedRequest.type) {
    case FlowOperationType.ADD_ACTION:
      clonedRequest.request.action.id =
        clonedRequest.request.action.id ?? openOpsId();
      clonedRequest.request.action.valid = true;
      switch (clonedRequest.request.action.type) {
        case ActionType.LOOP_ON_ITEMS:
          clonedRequest.request.action.valid = loopSettingsValidator.Check(
            clonedRequest.request.action.settings,
          );
          break;
        case ActionType.BRANCH:
          clonedRequest.request.action.valid = branchSettingsValidator.Check(
            clonedRequest.request.action.settings,
          );
          break;
        case ActionType.SPLIT: {
          clonedRequest.request.action.valid = splitSettingsValidator.Check(
            clonedRequest.request.action.settings,
          );
          break;
        }
        case ActionType.BLOCK:
          clonedRequest.request.action.valid = await validateAction({
            settings: clonedRequest.request.action.settings,
            projectId,
          });
          break;
        case ActionType.CODE: {
          break;
        }
      }
      break;
    case FlowOperationType.UPDATE_ACTION:
      switch (clonedRequest.request.type) {
        case ActionType.LOOP_ON_ITEMS:
          clonedRequest.request.valid = loopSettingsValidator.Check(
            clonedRequest.request.settings,
          );
          break;
        case ActionType.BRANCH:
          clonedRequest.request.valid = branchSettingsValidator.Check(
            clonedRequest.request.settings,
          );
          break;
        case ActionType.SPLIT: {
          clonedRequest.request.valid = splitSettingsValidator.Check(
            clonedRequest.request.settings,
          );
          break;
        }
        case ActionType.BLOCK: {
          const validationResult = await validateAction({
            settings: clonedRequest.request.settings,
            projectId,
          });
          if (clonedRequest.request.valid === false) {
            // Keep it false as set by frontend that does dynamic validation schema
          } else {
            clonedRequest.request.valid = validationResult;
          }
          break;
        }
        case ActionType.CODE: {
          clonedRequest.request.valid = true;
          break;
        }
      }
      break;
    case FlowOperationType.UPDATE_TRIGGER:
      switch (clonedRequest.request.type) {
        case TriggerType.EMPTY:
          clonedRequest.request.valid = false;
          break;
        case TriggerType.BLOCK:
          clonedRequest.request.valid = await validateTrigger({
            settings: clonedRequest.request.settings,
            projectId,
          });
          break;
      }
      break;

    default:
      break;
  }
  return clonedRequest;
}

async function validateAction({
  projectId,
  settings,
}: {
  projectId: ProjectId;
  settings: BlockActionSettings;
}): Promise<boolean> {
  if (
    isNil(settings.blockName) ||
    isNil(settings.blockVersion) ||
    isNil(settings.actionName) ||
    isNil(settings.input)
  ) {
    return false;
  }

  const block = await blockMetadataService.getOrThrow({
    projectId,
    name: settings.blockName,
    version: settings.blockVersion,
  });

  if (isNil(block)) {
    return false;
  }
  const action = block.actions[settings.actionName];
  if (isNil(action)) {
    return false;
  }
  const props = action.props;
  if (!isNil(block.auth) && action.requireAuth) {
    props.auth = block.auth;
  }
  return validateProps(props, settings.input);
}

async function validateTrigger({
  settings,
  projectId,
}: {
  settings: BlockTriggerSettings;
  projectId: ProjectId;
}): Promise<boolean> {
  if (
    isNil(settings.blockName) ||
    isNil(settings.blockVersion) ||
    isNil(settings.triggerName) ||
    isNil(settings.input)
  ) {
    return false;
  }

  const block = await blockMetadataService.getOrThrow({
    projectId,
    name: settings.blockName,
    version: settings.blockVersion,
  });
  if (isNil(block)) {
    return false;
  }
  const trigger = block.triggers[settings.triggerName];
  if (isNil(trigger)) {
    return false;
  }
  const props = trigger.props;
  if (!isNil(block.auth)) {
    props.auth = block.auth;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return validateProps(props, settings.input as any);
}

function validateProps(
  props: BlockPropertyMap,
  input: Record<string, unknown>,
): boolean {
  const propsSchema = buildSchema(props);
  const propsValidator = TypeCompiler.Compile(propsSchema);
  return propsValidator.Check(input);
}

function buildSchema(props: BlockPropertyMap): TSchema {
  const entries = Object.entries(props);
  const nonNullableUnknownPropType = Type.Not(
    Type.Union([Type.Null(), Type.Undefined()]),
    Type.Unknown(),
  );
  const propsSchema: Record<string, TSchema> = {};
  for (const [name, property] of entries) {
    switch (property.type) {
      case PropertyType.MARKDOWN:
        propsSchema[name] = Type.Optional(
          Type.Union([
            Type.Null(),
            Type.Undefined(),
            Type.Never(),
            Type.Unknown(),
          ]),
        );
        break;
      case PropertyType.DATE_TIME:
      case PropertyType.SHORT_TEXT:
      case PropertyType.LONG_TEXT:
      case PropertyType.FILE:
        propsSchema[name] = Type.String({
          minLength: property.required ? 1 : undefined,
        });
        break;
      case PropertyType.CHECKBOX:
        propsSchema[name] = Type.Union([Type.Boolean(), Type.String({})]);
        break;
      case PropertyType.NUMBER:
        // Because it could be a variable
        propsSchema[name] = Type.Union([Type.String({}), Type.Number({})]);
        break;
      case PropertyType.STATIC_DROPDOWN:
        propsSchema[name] = nonNullableUnknownPropType;
        break;
      case PropertyType.DROPDOWN:
        propsSchema[name] = nonNullableUnknownPropType;
        break;
      case PropertyType.BASIC_AUTH:
      case PropertyType.CUSTOM_AUTH:
      case PropertyType.SECRET_TEXT:
      case PropertyType.OAUTH2:
        // Only accepts connections variable.
        propsSchema[name] = Type.Union([
          Type.RegExp(RegExp('{{1}{connections.(.*?)}{1}}')),
          Type.String(),
        ]);
        break;
      case PropertyType.ARRAY:
        // Only accepts connections variable.
        propsSchema[name] = Type.Union([
          Type.Array(Type.Unknown({})),
          Type.String(),
        ]);
        break;
      case PropertyType.OBJECT:
        propsSchema[name] = Type.Union([
          Type.Record(Type.String(), Type.Any()),
          Type.String(),
        ]);
        break;
      case PropertyType.JSON:
        propsSchema[name] = Type.Union([
          Type.Record(Type.String(), Type.Any()),
          Type.Array(Type.Any()),
          Type.String(),
        ]);
        break;
      case PropertyType.MULTI_SELECT_DROPDOWN:
        propsSchema[name] = Type.Union([Type.Array(Type.Any()), Type.String()]);
        break;
      case PropertyType.STATIC_MULTI_SELECT_DROPDOWN:
        propsSchema[name] = Type.Union([Type.Array(Type.Any()), Type.String()]);
        break;
      case PropertyType.DYNAMIC:
        propsSchema[name] = Type.Record(Type.String(), Type.Any());
        break;
    }

    if (!property.required) {
      propsSchema[name] = Type.Optional(
        Type.Union([Type.Null(), Type.Undefined(), propsSchema[name]]),
      );
    }
  }

  return Type.Object(propsSchema);
}

type GetFlowVersionOrThrowParams = {
  flowId: FlowId;
  versionId: FlowVersionId | undefined;
  removeConnectionsName?: boolean;
  removeSampleData?: boolean;
  entityManager?: EntityManager;
};

type NewFlowVersion = Omit<FlowVersion, 'created' | 'updated'>;

type ApplyOperationParams = {
  userId: UserId | null;
  projectId: ProjectId;
  flowVersion: FlowVersion;
  userOperation: FlowOperationRequest;
  entityManager?: EntityManager;
};

type LockBlockVersionsParams = {
  projectId: ProjectId;
  flowVersion: FlowVersion;
  entityManager?: EntityManager;
};

type GetLatestsFlowVersionsByConnectionParams = {
  projectId: ProjectId;
  connectionName: string;
};
