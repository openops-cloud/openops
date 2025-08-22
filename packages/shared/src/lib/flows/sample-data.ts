import { Static, Type } from '@sinclair/typebox';

export const SampleDataSettingsObject = Type.Object(
  {
    sampleData: Type.Optional(
      Type.Unknown({
        description:
          'The sample data (mock output) for the step. Only add it if it can be easily inferred what the output of the step could be. Otherwise, leave it as null, unless the user asks for it.',
      }),
    ),
    customizedInputs: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  },
  {
    additionalProperties: true,
  },
);

export type SampleDataSettings = Static<typeof SampleDataSettingsObject>;

export const DEFAULT_SAMPLE_DATA_SETTINGS: SampleDataSettings = {
  customizedInputs: undefined,
  sampleData: undefined,
};
