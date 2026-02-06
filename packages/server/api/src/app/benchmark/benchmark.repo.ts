import { repoFactory } from '../core/db/repo-factory';
import { BenchmarkEntity } from './benchmark.entity';

export const benchmarkRepo = repoFactory(BenchmarkEntity);
