import { Property } from '@openops/blocks-framework';
import { Vendor } from '../common/recommendations-api';

export function getVendorsProperty() {
  return {
    vendor: Property.StaticDropdown({
      displayName: 'Vendor Type',
      description: 'The cloud vendor for which to fetch recommendations',
      required: true,
      options: {
        options: Object.values(Vendor).map((v) => ({
          label: v,
          value: v,
        })),
      },
    }),
  };
}

export function getRecommendationTypesProperty() {
  return {
    recommendationType: Property.Dropdown({
      displayName: 'Recommendation Type',
      description: 'The type of recommendations to fetch',
      required: true,
      refreshers: ['vendor'],
      options: async ({ vendor }) => {
        const recommendationTypes = getRecommendationTypesByVendor(
          vendor as Vendor,
        );

        if (!recommendationTypes?.length) {
          return {
            disabled: true,
            options: [],
            placeholder: 'No recommendations available for this vendor',
          };
        }

        return {
          disabled: false,
          options: recommendationTypes.map((type) => ({
            label: type.label,
            value: type.value,
          })),
        };
      },
    }),
  };
}

// https://www.ibm.com/docs/en/cloudability-commercial/cloudability-standard/saas?topic=api-rightsizing-end-points
function getRecommendationTypesByVendor(
  vendor: Vendor,
): { label: string; value: string }[] {
  switch (vendor) {
    case Vendor.AWS:
      return [
        { label: 'EC2', value: 'ec2' },
        { label: 'EC2 Auto Scaling Group', value: 'ec2-asg' },
        { label: 'EBS', value: 'ebs' },
        { label: 'S3', value: 's3' },
        { label: 'RDS', value: 'rds' },
        { label: 'Redshift', value: 'redshift' },
        { label: 'Lambda', value: 'lambda' },
      ];
    case Vendor.Azure:
      return [
        { label: 'Compute (VMs)', value: 'compute' },
        { label: 'Managed Disk', value: 'disk' },
        { label: 'SQL Database', value: 'sql' },
      ];
    case Vendor.GCP:
      return [
        { label: 'Compute Engine', value: 'compute' },
        { label: 'Managed Instance Group', value: 'compute-mig' },
        { label: 'Persistent Disk', value: 'disk' },
      ];
    case Vendor.Containers:
      return [{ label: 'Container Workloads', value: 'workloads' }];
    default:
      return [];
  }
}
