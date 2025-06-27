import { Static, Type } from '@sinclair/typebox';

export const CreateStepRunRequestBody = Type.Object({
  flowVersionId: Type.String(),
  stepName: Type.String(),
  id: Type.String(),
});

export type CreateStepRunRequestBody = Static<typeof CreateStepRunRequestBody>;

export const StepRunResponse = Type.Object({
  id: Type.String(),
  success: Type.Boolean(),
  input: Type.Unknown(),
  output: Type.Unknown(),
});

export type StepRunResponse = Static<typeof StepRunResponse>;

export const StepExecutionPath = Type.Array(
  Type.Tuple([Type.String(), Type.Number()]),
);
export type StepExecutionPath = Static<typeof StepExecutionPath>;
