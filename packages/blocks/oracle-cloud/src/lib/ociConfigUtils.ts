import { OracleCloudAuth } from '@openops/common';

export function toOCIConfig(
  auth: OracleCloudAuth,
  pemFilePath: string,
): string {
  return `[DEFAULT]
user=${auth.userOcid}
fingerprint=${auth.fingerprint}
key_file=${pemFilePath}
tenancy=${auth.tenancyOcid}
region=${auth.region}
`;
}
