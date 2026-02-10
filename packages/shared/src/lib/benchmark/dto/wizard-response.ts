import { Static, Type } from '@sinclair/typebox';

export const BenchmarkWizardOption = Type.Object({
  id: Type.String(),
  displayName: Type.String(),
  imageLogoUrl: Type.Optional(Type.String()),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

export type BenchmarkWizardOption = Static<typeof BenchmarkWizardOption>;

export const BenchmarkWizardStepResponse = Type.Object({
  currentStep: Type.String(),
  title: Type.String(),
  description: Type.Optional(Type.String()),
  nextStep: Type.Union([Type.String(), Type.Null()]),
  selectionType: Type.Union([
    Type.Literal('single'),
    Type.Literal('multi-select'),
  ]),
  options: Type.Array(BenchmarkWizardOption),
  stepIndex: Type.Number(),
  totalSteps: Type.Number(),
});

export type BenchmarkWizardStepResponse = Static<
  typeof BenchmarkWizardStepResponse
>;
