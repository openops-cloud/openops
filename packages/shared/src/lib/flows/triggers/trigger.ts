import { Static, Type } from '@sinclair/typebox';
import { BlockType, PackageType, VersionType } from '../../blocks';
import { SampleDataSettingsObject } from '../sample-data';

export const AUTHENTICATION_PROPERTY_NAME = 'auth';

export enum TriggerType {
  EMPTY = 'EMPTY',
  BLOCK = 'TRIGGER',
}

const commonProps = {
  id: Type.String(),
  name: Type.String({
    description:
      'The internal name of the trigger. Should always be the string: "trigger"',
  }),
  valid: Type.Boolean({}),
  displayName: Type.String({
    description: 'User friendly name for the trigger',
  }),
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
  triggerName: Type.Optional(
    Type.String({
      description:
        'Mandatory name of the trigger to be executed. This must exactly match the response from Get triggers by scope and name.',
    }),
  ),
  input: Type.Record(Type.String({}), Type.Any(), {
    description:
      'All trigger specific properties must be contained within the `input` object, not at the root level. ' +
      'IMPORTANT: If the trigger is a block, the input must be a record of string keys to any values.' +
      'For required properties, include the key with a `null` value if the value is unknown.' +
      'Example: { "timezone": "UTC", "day_of_the_week": 1, "hour_of_the_day": 9 }' +
      'Example for webhook: { "authType": "none", "authFields": {} }',
  }),
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

export type TriggerWithOptionalId = Static<typeof TriggerWithOptionalId>;

export const TriggerWithOptionalId = Type.Intersect([
  Type.Omit(Trigger, ['id']),
  Type.Object({
    id: Type.Optional(Type.String()),
  }),
]);

export const UpdateTriggerRequest = Type.Union([
  Type.Composite([
    Type.Omit(BlockTrigger, ['id']),
    Type.Object({
      id: Type.Optional(Type.String()),
    }),
  ]),
  Type.Composite([
    Type.Omit(EmptyTrigger, ['id']),
    Type.Object({
      id: Type.Optional(Type.String()),
    }),
  ]),
]);
export type UpdateTriggerRequest = Static<typeof UpdateTriggerRequest>;
