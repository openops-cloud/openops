import { getRecommendationsAction } from './base-get-recommendations-action';

export const getAwsRecommendationsAction = getRecommendationsAction(
  'AWS',
  getAwsRecommendationTypes(),
);

export function getAwsRecommendationTypes() {
  return [
    { label: 'EC2', value: 'ec2' },
    { label: 'EC2 Auto Scaling Group', value: 'ec2-asg' },
    { label: 'EBS', value: 'ebs' },
    { label: 'S3', value: 's3' },
    { label: 'RDS', value: 'rds' },
    { label: 'Redshift', value: 'redshift' },
    { label: 'Lambda', value: 'lambda' },
  ];
}
