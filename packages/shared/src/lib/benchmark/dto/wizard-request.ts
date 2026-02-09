import { Static, Type } from '@sinclair/typebox';

export const BenchmarkWizardConfiguration = Type.Object({
  currentStep: Type.Optional(Type.String()),
  answers: Type.Optional(Type.Record(Type.String(), Type.Array(Type.String()))),
});

export type BenchmarkWizardConfiguration = Static<
  typeof BenchmarkWizardConfiguration
>;
