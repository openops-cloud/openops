import { faker } from '@faker-js/faker';
import {
  BlockType,
  ContentType,
  File,
  FileCompression,
  FileType,
  Flow,
  FlowImportTemplate,
  FlowRun,
  FlowRunStatus,
  FlowRunTriggerSource,
  FlowStatus,
  FlowVersion,
  FlowVersionState,
  Folder,
  InvitationStatus,
  InvitationType,
  openOpsId,
  Organization,
  OrganizationRole,
  PackageType,
  Project,
  RunEnvironment,
  TemplateType,
  Trigger,
  TriggerType,
  User,
  UserInvitation,
  UserStatus,
} from '@openops/shared';
import bcrypt from 'bcrypt';
import { BlockMetadataSchema } from '../../../src/app/blocks/block-metadata-entity';
import { databaseConnection } from '../../../src/app/database/database-connection';

export const CLOUD_ORGANIZATION_ID = 'cloud-id';

export const createMockUser = (user?: Partial<User>): User => {
  return {
    id: user?.id ?? openOpsId(),
    created: user?.created ?? faker.date.recent().toISOString(),
    updated: user?.updated ?? faker.date.recent().toISOString(),
    email: user?.email ?? faker.internet.email(),
    firstName: user?.firstName ?? faker.person.firstName(),
    lastName: user?.lastName ?? faker.person.lastName(),
    trackEvents: user?.trackEvents ?? faker.datatype.boolean(),
    newsLetter: user?.newsLetter ?? faker.datatype.boolean(),
    password: user?.password
      ? bcrypt.hashSync(user.password, 10)
      : faker.internet.password(),
    status: user?.status ?? faker.helpers.enumValue(UserStatus),
    organizationRole:
      user?.organizationRole ?? faker.helpers.enumValue(OrganizationRole),
    verified: user?.verified ?? faker.datatype.boolean(),
    externalId: user?.externalId,
    organizationId: user?.organizationId ?? null,
  };
};

export const createMockTemplate = (
  template?: Partial<FlowImportTemplate>,
): FlowImportTemplate => {
  return {
    name: template?.name ?? faker.lorem.word(),
    description: template?.description ?? faker.lorem.sentence(),
    type: template?.type ?? faker.helpers.enumValue(TemplateType),
    tags: template?.tags ?? [],
    services: template?.services ?? [],
    domains: template?.domains ?? [],
    blocks: template?.blocks ?? [],
    template: template?.template ?? createMockFlowVersion(),
    projectId: template?.projectId ?? openOpsId(),
    organizationId: template?.organizationId ?? openOpsId(),
    id: template?.id ?? openOpsId(),
    created: template?.created ?? faker.date.recent().toISOString(),
    updated: template?.updated ?? faker.date.recent().toISOString(),
    categories: template?.categories ?? [],
  };
};

export const createMockUserInvitation = (
  userInvitation: Partial<UserInvitation>,
): UserInvitation => {
  return {
    id: userInvitation.id ?? openOpsId(),
    created: userInvitation.created ?? faker.date.recent().toISOString(),
    updated: userInvitation.updated ?? faker.date.recent().toISOString(),
    email: userInvitation.email ?? faker.internet.email(),
    type: userInvitation.type ?? faker.helpers.enumValue(InvitationType),
    organizationId: userInvitation.organizationId ?? openOpsId(),
    projectId: userInvitation.projectId,
    projectRole: userInvitation.projectRole,
    organizationRole: userInvitation.organizationRole,
    status: userInvitation.status ?? faker.helpers.enumValue(InvitationStatus),
  };
};

export const createMockProject = (project?: Partial<Project>): Project => {
  return {
    id: project?.id ?? openOpsId(),
    created: project?.created ?? faker.date.recent().toISOString(),
    updated: project?.updated ?? faker.date.recent().toISOString(),
    deleted: project?.deleted ?? null,
    ownerId: project?.ownerId ?? openOpsId(),
    displayName: project?.displayName ?? faker.lorem.word(),
    organizationId: project?.organizationId ?? openOpsId(),
    tablesDatabaseId: project?.tablesDatabaseId ?? faker.number.int(),
  };
};

export const createMockFolder = (projectId: string): Folder => {
  return {
    id: openOpsId(),
    created: faker.date.recent().toISOString(),
    updated: faker.date.recent().toISOString(),
    displayName: faker.lorem.word(),
    projectId,
    contentType: ContentType.WORKFLOW,
  };
};

export const createMockOrganization = (
  organization?: Partial<Organization>,
): Organization => {
  return {
    id: organization?.id ?? openOpsId(),
    created: organization?.created ?? faker.date.recent().toISOString(),
    updated: organization?.updated ?? faker.date.recent().toISOString(),
    ownerId: organization?.ownerId ?? openOpsId(),
    name: organization?.name ?? faker.lorem.word(),
    tablesWorkspaceId: organization?.tablesWorkspaceId ?? faker.number.int(),
  };
};

export const createMockOrganizationWithOwner = (
  params?: CreateMockOrganizationWithOwnerParams,
): CreateMockOrganizationWithOwnerReturn => {
  const mockOwnerId = params?.owner?.id ?? openOpsId();
  const mockOrganizationId = params?.organization?.id ?? openOpsId();

  const mockOwner = createMockUser({
    ...params?.owner,
    id: mockOwnerId,
    organizationId: mockOrganizationId,
    organizationRole: OrganizationRole.ADMIN,
  });

  const mockOrganization = createMockOrganization({
    ...params?.organization,
    id: mockOrganizationId,
    ownerId: mockOwnerId,
  });

  return {
    mockOrganization,
    mockOwner,
  };
};

export const createMockBlockMetadata = (
  blockMetadata?: Partial<Omit<BlockMetadataSchema, 'project'>>,
): Omit<BlockMetadataSchema, 'project'> => {
  return {
    id: blockMetadata?.id ?? openOpsId(),
    projectUsage: 0,
    created: blockMetadata?.created ?? faker.date.recent().toISOString(),
    updated: blockMetadata?.updated ?? faker.date.recent().toISOString(),
    name: blockMetadata?.name ?? faker.lorem.word(),
    displayName: blockMetadata?.displayName ?? faker.lorem.word(),
    logoUrl: blockMetadata?.logoUrl ?? faker.image.urlPlaceholder(),
    description: blockMetadata?.description ?? faker.lorem.sentence(),
    projectId: blockMetadata?.projectId,
    directoryPath: blockMetadata?.directoryPath,
    auth: blockMetadata?.auth,
    authors: blockMetadata?.authors ?? [],
    organizationId: blockMetadata?.organizationId,
    version: blockMetadata?.version ?? faker.system.semver(),
    minimumSupportedRelease: blockMetadata?.minimumSupportedRelease ?? '0.0.0',
    maximumSupportedRelease: blockMetadata?.maximumSupportedRelease ?? '9.9.9',
    actions: blockMetadata?.actions ?? {},
    triggers: blockMetadata?.triggers ?? {},
    blockType: blockMetadata?.blockType ?? faker.helpers.enumValue(BlockType),
    packageType:
      blockMetadata?.packageType ?? faker.helpers.enumValue(PackageType),
    archiveId: blockMetadata?.archiveId,
    categories: blockMetadata?.categories ?? [],
  };
};

export const createMockFlowRun = (flowRun?: Partial<FlowRun>): FlowRun => {
  return {
    id: flowRun?.id ?? openOpsId(),
    created: flowRun?.created ?? faker.date.recent().toISOString(),
    updated: flowRun?.updated ?? faker.date.recent().toISOString(),
    projectId: flowRun?.projectId ?? openOpsId(),
    flowId: flowRun?.flowId ?? openOpsId(),
    tags: flowRun?.tags ?? [],
    steps: {},
    flowVersionId: flowRun?.flowVersionId ?? openOpsId(),
    flowDisplayName: flowRun?.flowDisplayName ?? faker.lorem.word(),
    logsFileId: flowRun?.logsFileId ?? null,
    tasks: flowRun?.tasks,
    status: flowRun?.status ?? faker.helpers.enumValue(FlowRunStatus),
    startTime: flowRun?.startTime ?? faker.date.recent().toISOString(),
    finishTime: flowRun?.finishTime ?? faker.date.recent().toISOString(),
    environment:
      flowRun?.environment ?? faker.helpers.enumValue(RunEnvironment),
    triggerSource: flowRun?.triggerSource ?? FlowRunTriggerSource.TEST_RUN,
  };
};

export const createMockFlow = (flow?: Partial<Flow>): Flow => {
  return {
    id: flow?.id ?? openOpsId(),
    created: flow?.created ?? faker.date.recent().toISOString(),
    updated: flow?.updated ?? faker.date.recent().toISOString(),
    projectId: flow?.projectId ?? openOpsId(),
    status: flow?.status ?? faker.helpers.enumValue(FlowStatus),
    folderId: flow?.folderId ?? null,
    schedule: flow?.schedule ?? null,
    publishedVersionId: flow?.publishedVersionId ?? null,
    isInternal: flow?.isInternal ?? false,
  };
};

export const createMockFlowVersion = (
  flowVersion?: Partial<FlowVersion>,
): FlowVersion => {
  const emptyTrigger = {
    id: 'trigger',
    type: TriggerType.EMPTY,
    name: 'trigger',
    settings: {},
    valid: false,
    displayName: 'Select Trigger',
  } as const;

  return {
    id: flowVersion?.id ?? openOpsId(),
    created: flowVersion?.created ?? faker.date.recent().toISOString(),
    updated: flowVersion?.updated ?? faker.date.recent().toISOString(),
    displayName: flowVersion?.displayName ?? faker.word.words(),
    description: flowVersion?.description ?? faker.lorem.sentence(),
    flowId: flowVersion?.flowId ?? openOpsId(),
    trigger: flowVersion?.trigger ?? emptyTrigger,
    state: flowVersion?.state ?? faker.helpers.enumValue(FlowVersionState),
    updatedBy: flowVersion?.updatedBy,
    valid: flowVersion?.valid ?? faker.datatype.boolean(),
    testRunActionLimits: flowVersion?.testRunActionLimits ?? {
      isEnabled: true,
      limits: [],
    },
  };
};

export const createMockTrigger = (): Trigger => {
  return {
    id: 'trigger',
    type: TriggerType.EMPTY,
    name: 'trigger',
    settings: {},
    valid: false,
    displayName: 'Select Trigger',
    nextAction: {
      name: 'step_2',
      valid: false,
      displayName: 'Custom Javascript Cod',
      type: 'CODE',
      settings: {},
      nextAction: {
        name: 'step_1',
        type: 'CODE',
        valid: true,
        settings: {
          input: {},
          sourceCode: {
            code: 'export const code = async (inputs) => {\n  return true;\n};',
            packageJson: {},
          },
          inputUiInfo: {
            customizedInputs: {},
          },
          errorHandlingOptions: {
            retryOnFailure: {
              value: false,
            },
            continueOnFailure: {
              value: false,
            },
          },
        },
        nextAction: {},
      },
    },
  };
};

export const mockBasicSetup = async (
  params?: MockBasicSetupParams,
): Promise<MockBasicSetup> => {
  const mockOwner = createMockUser({
    ...params?.user,
    organizationRole: OrganizationRole.ADMIN,
  });
  await databaseConnection().getRepository('user').save(mockOwner);

  const mockOrganization = createMockOrganization({
    ...params?.organization,
    ownerId: mockOwner.id,
  });
  await databaseConnection()
    .getRepository('organization')
    .save(mockOrganization);

  mockOwner.organizationId = mockOrganization.id;
  await databaseConnection().getRepository('user').save(mockOwner);

  const mockProject = createMockProject({
    ...params?.project,
    ownerId: mockOwner.id,
    organizationId: mockOrganization.id,
  });
  await databaseConnection().getRepository('project').save(mockProject);

  return {
    mockOwner,
    mockOrganization,
    mockProject,
  };
};

export const createMockFile = (file?: Partial<File>): File => {
  return {
    id: file?.id ?? openOpsId(),
    created: file?.created ?? faker.date.recent().toISOString(),
    updated: file?.updated ?? faker.date.recent().toISOString(),
    organizationId: file?.organizationId ?? openOpsId(),
    projectId: file?.projectId ?? openOpsId(),
    compression: file?.compression ?? faker.helpers.enumValue(FileCompression),
    data: file?.data ?? Buffer.from(faker.lorem.paragraphs()),
    type: file?.type ?? faker.helpers.enumValue(FileType),
  };
};

type CreateMockOrganizationWithOwnerParams = {
  organization?: Partial<Omit<Organization, 'ownerId'>>;
  owner?: Partial<Omit<User, 'organizationId'>>;
};

type CreateMockOrganizationWithOwnerReturn = {
  mockOrganization: Organization;
  mockOwner: User;
};

type MockBasicSetup = {
  mockOwner: User;
  mockOrganization: Organization;
  mockProject: Project;
};

type MockBasicSetupParams = {
  user?: Partial<User>;
  organization?: Partial<Organization>;
  project?: Partial<Project>;
};
