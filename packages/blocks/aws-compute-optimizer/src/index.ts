import { createBlock } from '@openops/blocks-framework';
import { amazonAuth } from '@openops/common';
import { BlockCategory } from '@openops/shared';
import { ebsGetRecommendationsAction } from './lib/actions/ebs-get-recommendations-action';
import { ec2GetRecommendationsAction } from './lib/actions/ec2-get-recommendations-action';
import { getRecommendationsSummaryAction } from './lib/actions/get-recommendations-summary-action';

export const computeOptimizer = createBlock({
  displayName: 'AWS Compute Optimizer',
  logoUrl: '/blocks/aws-compute-optimizer.svg',
  minimumSupportedRelease: '0.8.0',
  authors: ['OpenOps'],
  categories: [BlockCategory.CLOUD],
  auth: amazonAuth,
  actions: [
    getRecommendationsSummaryAction,
    ebsGetRecommendationsAction,
    ec2GetRecommendationsAction,
  ],
  triggers: [],
});
