import { Static, Type } from '@sinclair/typebox';

export enum PackageType {
  ARCHIVE = 'ARCHIVE',
  REGISTRY = 'REGISTRY',
}

export enum BlockType {
  CUSTOM = 'CUSTOM',
  OFFICIAL = 'OFFICIAL',
}

export const PrivateBlockPackage = Type.Object({
  packageType: Type.Literal(PackageType.ARCHIVE),
  blockType: Type.Enum(BlockType),
  blockName: Type.String(),
  blockVersion: Type.String(),
  archiveId: Type.String(),
  archive: Type.Unknown(),
});

export type PrivateBlockPackage = Static<typeof PrivateBlockPackage>;

export const PublicBlockPackage = Type.Object({
  packageType: Type.Literal(PackageType.REGISTRY),
  blockType: Type.Enum(BlockType),
  blockName: Type.String(),
  blockVersion: Type.String(),
});

export type PublicBlockPackage = Static<typeof PublicBlockPackage>;

export type BlockPackage = PrivateBlockPackage | PublicBlockPackage;

export enum BlockCategory {
  CLOUD = 'CLOUD',
  COMMUNICATION = 'COMMUNICATION',
  CORE = 'CORE',
  DATA = 'DATA',
  FINOPS = 'FINOPS',
  IaC = 'IaC',
  NETWORK = 'NETWORK',
  PREMIUM = 'PREMIUM',
  PROJECT_MANAGEMENT = 'PROJECT_MANAGEMENT',
  WORKFLOW = 'WORKFLOW',
}
