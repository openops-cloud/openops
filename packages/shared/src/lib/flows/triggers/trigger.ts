import { Static, Type } from '@sinclair/typebox';
import { BlockType, PackageType, VersionType } from '../../blocks';
import { SampleDataSettingsObject } from '../sample-data';

export const AUTHENTICATION_PROPERTY_NAME = 'auth';

export enum TriggerType {
  EMPTY = 'EMPTY',
  BLOCK = 'TRIGGER',
}

const commonProps = {
  id: Type.Optional(Type.String()),
  name: Type.String({}),
  valid: Type.Boolean({}),
  displayName: Type.String({}),
  nextAction: Type.Optional(Type.Any()),
};

export const EmptyTrigger = Type.Object({
  ...commonProps,
  type: Type.Literal(TriggerType.EMPTY),
  settings: Type.Any(),
});

export type EmptyTrigger = Static<typeof EmptyTrigger>;

export const BlockTriggerSettings = Type.Object({
  blockName: Type.String({}),
  blockVersion: VersionType,
  blockType: Type.Enum(BlockType),
  packageType: Type.Enum(PackageType),
  triggerName: Type.Optional(Type.String({})),
  input: Type.Record(Type.String({}), Type.Any()),
  inputUiInfo: SampleDataSettingsObject,
});

export type BlockTriggerSettings = Static<typeof BlockTriggerSettings>;

export const BlockTrigger = Type.Object({
  ...commonProps,
  type: Type.Literal(TriggerType.BLOCK),
  settings: BlockTriggerSettings,
});

export type BlockTrigger = Static<typeof BlockTrigger>;

export const Trigger = Type.Union([BlockTrigger, EmptyTrigger]);

export type Trigger = Static<typeof Trigger>;
