import {
  BlockCategory,
  BlockType,
  PackageType,
  ProjectId,
  RiskLevel,
  TriggerTestStrategy,
} from '@openops/shared';
import { Static, Type } from '@sinclair/typebox';
import { ErrorHandlingOptionsParam } from './action/action';
import { BlockPropertyMap } from './property';
import { BlockAuthProperty } from './property/authentication';
import {
  TriggerStrategy,
  WebhookHandshakeConfiguration,
  WebhookRenewConfiguration,
} from './trigger/trigger';

export const BlockBase = Type.Object({
  id: Type.Optional(Type.String()),
  name: Type.String(),
  displayName: Type.String(),
  description: Type.String(),
});

export type BlockBase = {
  id?: string;
  name: string;
  displayName: string;
  description: string;
};

export const BlockBaseDetails = Type.Composite([
  BlockBase,
  Type.Object({
    logoUrl: Type.String(),
    projectId: Type.Optional(Type.String()),
    authors: Type.Array(Type.String()),
    organizationId: Type.Optional(Type.String()),
    directoryPath: Type.Optional(Type.String()),
    auth: Type.Optional(BlockAuthProperty),
    version: Type.String(),
    categories: Type.Optional(Type.Array(Type.Enum(BlockCategory))),
    minimumSupportedRelease: Type.Optional(Type.String()),
    maximumSupportedRelease: Type.Optional(Type.String()),
  }),
]);

export type BlockBaseDetails = BlockBase & {
  logoUrl: string;
  projectId?: ProjectId;
  organizationId?: string;
  authors: string[];
  directoryPath?: string;
  auth?: BlockAuthProperty;
  version: string;
  categories?: BlockCategory[];
  minimumSupportedRelease?: string;
  maximumSupportedRelease?: string;
};

export const ActionBase = Type.Object({
  name: Type.String(),
  displayName: Type.String(),
  description: Type.String(),
  riskLevel: Type.Optional(Type.Enum(RiskLevel)),
  props: BlockPropertyMap,
  requireAuth: Type.Boolean(),
  errorHandlingOptions: Type.Optional(ErrorHandlingOptionsParam),
});

export type ActionBase = {
  name: string;
  displayName: string;
  description: string;
  props: BlockPropertyMap;
  riskLevel?: RiskLevel;
  requireAuth: boolean;
  errorHandlingOptions?: ErrorHandlingOptionsParam;
};

export const TriggerBase = Type.Composite([
  Type.Omit(ActionBase, ['requireAuth']),
  Type.Object({
    type: Type.Enum(TriggerStrategy),
    sampleData: Type.Unknown(),
    handshakeConfiguration: Type.Optional(WebhookHandshakeConfiguration),
    renewConfiguration: Type.Optional(WebhookRenewConfiguration),
    testStrategy: Type.Enum(TriggerTestStrategy),
  }),
]);
export type TriggerBase = Omit<ActionBase, 'requireAuth'> & {
  type: TriggerStrategy;
  sampleData: unknown;
  handshakeConfiguration?: WebhookHandshakeConfiguration;
  renewConfiguration?: WebhookRenewConfiguration;
  testStrategy: TriggerTestStrategy;
};

export const BlockMetadata = Type.Composite([
  BlockBaseDetails,
  Type.Object({
    actions: Type.Record(Type.String(), ActionBase),
    triggers: Type.Record(Type.String(), TriggerBase),
  }),
]);

export type BlockMetadata = BlockBaseDetails & {
  actions: Record<string, ActionBase>;
  triggers: Record<string, TriggerBase>;
};

export const BlockMetadataSummary = Type.Composite([
  Type.Omit(BlockMetadata, ['actions', 'triggers']),
  Type.Object({
    actions: Type.Number(),
    triggers: Type.Number(),
    suggestedActions: Type.Optional(
      Type.Array(
        Type.Object({
          name: Type.String(),
          displayName: Type.String(),
        }),
      ),
    ),
    suggestedTriggers: Type.Optional(
      Type.Array(
        Type.Object({
          name: Type.String(),
          displayName: Type.String(),
        }),
      ),
    ),
  }),
]);
export type BlockMetadataSummary = Omit<
  BlockMetadata,
  'actions' | 'triggers'
> & {
  actions: number;
  triggers: number;
  suggestedActions?: ActionBase[];
  suggestedTriggers?: TriggerBase[];
};

const BlockPackageMetadata = Type.Object({
  projectUsage: Type.Number(),
  blockType: Type.Enum(BlockType),
  packageType: Type.Enum(PackageType),
  archiveId: Type.Optional(Type.String()),
});
type BlockPackageMetadata = Static<typeof BlockPackageMetadata>;

export const BlockMetadataModel = Type.Composite([
  BlockMetadata,
  BlockPackageMetadata,
]);
export type BlockMetadataModel = BlockMetadata & BlockPackageMetadata;

export const BlockMetadataModelSummary = Type.Composite([
  BlockMetadataSummary,
  BlockPackageMetadata,
]);
export type BlockMetadataModelSummary = BlockMetadataSummary &
  BlockPackageMetadata;
