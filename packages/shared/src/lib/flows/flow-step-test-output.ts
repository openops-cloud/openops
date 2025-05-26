import { Static, Type } from '@sinclair/typebox';
import { BaseModelSchema } from '../common';
import { OpenOpsId } from '../common/id-generator';

export const FlowStepTestOutput = Type.Object({
  ...BaseModelSchema,
  stepId: Type.String(),
  flowVersionId: Type.String(),
  output: Type.Unknown(),
});

export type FlowStepTestOutput = Static<typeof FlowStepTestOutput>;

export type StepOutputWithData = {
  output: unknown;
  lastTestDate: string;
};

export function encodeTestOutputs(
  testOutputs: FlowStepTestOutput[],
): Record<OpenOpsId, string> {
  return Object.fromEntries(
    testOutputs.map((testOutput) => [
      testOutput.stepId as OpenOpsId,
      (testOutput.output as Buffer).toString('base64'),
    ]),
  );
}

export function decodeTestOutputs(
  testOutputs: Record<OpenOpsId, string>,
): Record<OpenOpsId, Buffer> {
  const decoded: Record<OpenOpsId, Buffer> = {};

  for (const [key, base64Value] of Object.entries(testOutputs)) {
    decoded[key as OpenOpsId] = Buffer.from(base64Value, 'base64');
  }

  return decoded;
}
