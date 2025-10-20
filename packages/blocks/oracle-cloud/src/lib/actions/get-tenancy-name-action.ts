import { createAction } from '@openops/blocks-framework';
import { oracleCloudAuth } from '@openops/common';
import { getIdentityClient } from '../ociClientFactory';
import { toOCIConfig } from '../ociConfigUtils';
import { deleteFileSafe, writeTempFile } from '../tempFileUtils';

function normalizePem(input: string): string {
  if (input.includes('-----BEGIN')) {
    return input;
  }

  try {
    const decoded = Buffer.from(input, 'base64').toString('utf8');
    if (!decoded.includes('-----BEGIN')) {
      throw new Error('Decoded private key does not look like PEM format');
    }
    return decoded;
  } catch (err) {
    throw new Error(
      'Invalid private key format: could not parse as PEM or base64',
    );
  }
}

export const getTenancyName = createAction({
  auth: oracleCloudAuth,
  name: 'oci_get_tenancy_name',
  description: 'Retrieves the OCI tenancy name using provided credentials',
  displayName: 'Get OCI Tenancy Name',
  isWriteAction: false,
  props: {},
  run: async ({ auth }) => {
    if (!auth.privateKeyPem) {
      throw new Error('No private key provided in auth.privateKeyPem');
    }

    const pemContent = normalizePem(auth.privateKeyPem);

    let pemPath: string | undefined;
    let configPath: string | undefined;

    try {
      pemPath = await writeTempFile(pemContent, '.pem');

      const configContent = toOCIConfig(auth, pemPath);
      configPath = await writeTempFile(configContent);

      const identityClient = await getIdentityClient(configPath);
      const { tenancy: tenancyDetails } = await identityClient.getTenancy({
        tenancyId: auth.tenancyOcid,
      });

      return { tenancyName: tenancyDetails.name };
    } finally {
      if (pemPath) await deleteFileSafe(pemPath);
      if (configPath) await deleteFileSafe(configPath);
    }
  },
});
