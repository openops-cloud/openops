import { Static, Type } from '@sinclair/typebox';
import { BaseModelSchema } from '../common';

export const FlowStepTestOutput = Type.Object({
  ...BaseModelSchema,
  stepId: Type.String(),
  flowVersionId: Type.String(),
  output: Type.Unknown(),
});

export type FlowStepTestOutput = Static<typeof FlowStepTestOutput>;
