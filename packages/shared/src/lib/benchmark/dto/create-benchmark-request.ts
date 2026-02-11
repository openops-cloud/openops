import { Static, Type } from '@sinclair/typebox';
import { BenchmarkConfiguration } from './wizard-request';

export const CreateBenchmarkRequest = Type.Object({
  benchmarkConfiguration: BenchmarkConfiguration,
});

export type CreateBenchmarkRequest = Static<typeof CreateBenchmarkRequest>;
