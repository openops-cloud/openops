export type RecommendationCategory = 'cost' | 'security';

export interface RecommendationType {
  value: string;
  label: string;
  category: RecommendationCategory;
}

// Mirrors the recommendation modules in OptScale's bumiworker and the
// categories assigned to them in the OptScale UI. The API exposes no category.
export const RECOMMENDATION_TYPES: RecommendationType[] = [
  { value: 'abandoned_images', label: 'Abandoned images', category: 'cost' },
  {
    value: 'abandoned_instances',
    label: 'Abandoned instances',
    category: 'cost',
  },
  {
    value: 'abandoned_kinesis_streams',
    label: 'Abandoned Kinesis streams',
    category: 'cost',
  },
  {
    value: 'abandoned_load_balancers',
    label: 'Abandoned load balancers',
    category: 'cost',
  },
  {
    value: 's3_abandoned_buckets',
    label: 'Abandoned S3 buckets',
    category: 'cost',
  },
  {
    value: 's3_abandoned_buckets_nebius',
    label: 'Abandoned Nebius S3 buckets',
    category: 'cost',
  },
  {
    value: 'cvos_opportunities',
    label: 'CVOS agreement opportunities',
    category: 'cost',
  },
  {
    value: 'inactive_console_users',
    label: 'Inactive console users',
    category: 'security',
  },
  {
    value: 'inactive_users',
    label: 'Inactive IAM users',
    category: 'security',
  },
  {
    value: 'insecure_security_groups',
    label: 'Instances with insecure security groups',
    category: 'security',
  },
  {
    value: 'instances_for_shutdown',
    label: 'Instances eligible for power schedules',
    category: 'cost',
  },
  {
    value: 'instance_generation_upgrade',
    label: 'Instance generation upgrade',
    category: 'cost',
  },
  {
    value: 'instances_in_stopped_state_for_a_long_time',
    label: 'Instances stopped for a long time',
    category: 'cost',
  },
  {
    value: 'instance_migration',
    label: 'Instance migration to a cheaper region',
    category: 'cost',
  },
  {
    value: 'instance_subscription',
    label: 'Instance subscription',
    category: 'cost',
  },
  {
    value: 's3_intelligent_tiering',
    label: 'S3 Intelligent-Tiering',
    category: 'cost',
  },
  { value: 'nebius_migration', label: 'Migration to Nebius', category: 'cost' },
  { value: 'obsolete_images', label: 'Obsolete images', category: 'cost' },
  { value: 'obsolete_ips', label: 'Obsolete IPs', category: 'cost' },
  {
    value: 'obsolete_snapshot_chains',
    label: 'Obsolete snapshot chains',
    category: 'cost',
  },
  {
    value: 'obsolete_snapshots',
    label: 'Obsolete snapshots',
    category: 'cost',
  },
  {
    value: 's3_public_buckets',
    label: 'Public S3 buckets',
    category: 'security',
  },
  {
    value: 'reserved_instances',
    label: 'Reserved instances opportunities',
    category: 'cost',
  },
  {
    value: 'rightsizing_instances',
    label: 'Instance rightsizing',
    category: 'cost',
  },
  { value: 'rightsizing_rds', label: 'RDS rightsizing', category: 'cost' },
  {
    value: 'short_living_instances',
    label: 'Short living instances',
    category: 'cost',
  },
  {
    value: 'snapshots_with_non_used_images',
    label: 'Snapshots of unused images',
    category: 'cost',
  },
  {
    value: 'volumes_not_attached_for_a_long_time',
    label: 'Volumes not attached for a long time',
    category: 'cost',
  },
];

// OptScale rejects dismiss/activate for these modules (OE0217).
export const NON_DISMISSIBLE_RECOMMENDATION_TYPES = [
  'obsolete_images',
  'short_living_instances',
];

export function getRecommendationCategory(
  type: string,
): RecommendationCategory | undefined {
  return RECOMMENDATION_TYPES.find((t) => t.value === type)?.category;
}

export function getRecommendationTypeOptions(
  types: RecommendationType[] = RECOMMENDATION_TYPES,
): { label: string; value: string }[] {
  return types.map(({ label, value }) => ({ label, value }));
}
