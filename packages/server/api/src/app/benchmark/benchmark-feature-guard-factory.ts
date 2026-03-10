import { preHandlerAsyncHookHandler } from 'fastify';
import { assertBenchmarkFeatureEnabled } from './benchmark-feature-guard';

export const getBenchmarkFeatureGuard = (): preHandlerAsyncHookHandler => {
  return assertBenchmarkFeatureEnabled;
};
