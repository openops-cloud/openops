export enum Vendor {
  AWS = 'AWS',
  Azure = 'Azure',
  GCP = 'GCP',
  Containers = 'Containers',
}

export function getRecommendationTypesByVendor(
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
