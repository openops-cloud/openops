import { Static, Type } from '@sinclair/typebox';
import { BaseModelSchema } from '../common';
import { OpenOpsId } from '../common/id-generator';

export type EncryptedStepOutput = {
  iv: string;
  data: string;
};

export const FlowStepTestOutput = Type.Object({
  ...BaseModelSchema,
  stepId: Type.String(),
  flowVersionId: Type.String(),
  input: Type.Unknown(),
  output: Type.Unknown(),
  success: Type.Boolean(),
});

export type FlowStepTestOutput = Static<typeof FlowStepTestOutput>;

export type StepOutputWithData = {
  input: unknown;
  output: unknown;
  lastTestDate: string;
  success: boolean | null;
};

export function groupStepOutputsById(
  stepTestOutputs: FlowStepTestOutput[],
): Record<OpenOpsId, EncryptedStepOutput> {
  return Object.fromEntries(
    stepTestOutputs.map((testOutput) => [
      testOutput.stepId as OpenOpsId,
      testOutput.output as EncryptedStepOutput,
    ]),
  );
}
