import { Static, Type } from '@sinclair/typebox';

export const SampleDataSettingsObject = Type.Object(
  {
    sampleData: Type.Optional(Type.Unknown()),
    customizedInputs: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  },
  {
    additionalProperties: true,
  },
);

export type SampleDataSettings = Static<typeof SampleDataSettingsObject>;

export const DEFAULT_SAMPLE_DATA_SETTINGS: SampleDataSettings = {
  customizedInputs: undefined,
};
