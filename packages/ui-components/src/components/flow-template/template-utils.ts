// replace services like "AWS EC2" or "GCP .." or "Azure .." with just "EC2"
export const replaceServicePrefix = (service?: string) => {
  if (!service) return '';
  const match = service.match(/^(AWS|GCP|Azure)\s+([^\s].*)$/);
  return match ? match[2] : service;
};
