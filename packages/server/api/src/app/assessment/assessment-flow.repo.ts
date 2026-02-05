import { repoFactory } from '../core/db/repo-factory';
import { AssessmentFlowEntity } from './assessment-flow.entity';

export const assessmentFlowRepo = repoFactory(AssessmentFlowEntity);
