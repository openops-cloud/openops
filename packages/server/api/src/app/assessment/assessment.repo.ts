import { repoFactory } from '../core/db/repo-factory';
import { AssessmentEntity } from './assessment.entity';

export const assessmentRepo = repoFactory(AssessmentEntity);
