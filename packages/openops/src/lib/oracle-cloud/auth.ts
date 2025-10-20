import { BlockAuth, Property } from '@openops/blocks-framework';

const markdown = `
1. Log into Oracle Cloud(OCI) console.\n
2. Go to your profile.\n
3. Add API key.\n
4. Get the config file details and paste the content in the respective fields.\n
`;

export interface OracleCloudAuth {
  tenancyOcid: string;
  userOcid: string;
  fingerprint: string;
  privateKeyPem: string;
  region: string;
}

export const oracleCloudAuth = BlockAuth.CustomAuth({
  authProviderKey: 'OCI',
  authProviderDisplayName: 'Oracle Cloud Infrastructure',
  authProviderLogoUrl: `https://static.openops.com/blocks/oracle-cloud.svg`,
  description: markdown,
  props: {
    tenancyOcid: Property.ShortText({
      displayName: 'Tenancy OCID',
      required: true,
    }),
    userOcid: Property.ShortText({
      displayName: 'User OCID',
      required: true,
    }),
    fingerprint: Property.ShortText({
      displayName: 'API Key Fingerprint',
      required: true,
    }),
    privateKeyPem: Property.SecretText({
      displayName: 'Private Key (base64 format of PEM)',
      required: true,
    }),
    region: Property.ShortText({
      displayName: 'Region',
      required: true,
      description: 'Example: us-ashburn-1',
    }),
  },
  required: true,
  validate: async ({ auth }) => {
    if (!auth.tenancyOcid)
      return { valid: false, error: 'Tenancy OCID is required' };
    if (!auth.userOcid) return { valid: false, error: 'User OCID is required' };
    if (!auth.fingerprint)
      return { valid: false, error: 'Fingerprint is required' };
    if (!auth.privateKeyPem)
      return { valid: false, error: 'Private Key PEM is required' };
    if (!auth.region) return { valid: false, error: 'Region is required' };
    return { valid: true };
  },
});
