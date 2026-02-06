import { repoFactory } from '../core/db/repo-factory';
import { BenchmarkFlowEntity } from './benchmark-flow.entity';

export const benchmarkFlowRepo = repoFactory(BenchmarkFlowEntity);
