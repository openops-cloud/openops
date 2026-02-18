import { Static, Type } from '@sinclair/typebox';

export const BenchmarkConfiguration = Type.Record(
  Type.String(),
  Type.Array(Type.String()),
);

export type BenchmarkConfiguration = Static<typeof BenchmarkConfiguration>;

export const BenchmarkWizardRequest = Type.Object({
  currentStep: Type.Optional(Type.String()),
  benchmarkConfiguration: Type.Optional(BenchmarkConfiguration),
});

export type BenchmarkWizardRequest = Static<typeof BenchmarkWizardRequest>;
