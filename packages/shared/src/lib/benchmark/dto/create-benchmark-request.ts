import { Static, Type } from '@sinclair/typebox';
import { BenchmarkConfiguration } from '../../wizard/wizard-request';

export const CreateBenchmarkRequest = Type.Object({
  benchmarkConfiguration: BenchmarkConfiguration,
});

export type CreateBenchmarkRequest = Static<typeof CreateBenchmarkRequest>;
