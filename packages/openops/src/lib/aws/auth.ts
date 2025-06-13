/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { BlockAuth, Property } from '@openops/blocks-framework';
import { SharedSystemProp, system } from '@openops/server-shared';
import { parseArn } from './arn-handler';
import { assumeRole } from './sts-common';

const isImplicitRoleEnabled = system.getBoolean(
  SharedSystemProp.AWS_ENABLE_IMPLICIT_ROLE,
);

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  endpoint?: string | undefined | null;
}

export interface Role {
  assumeRoleArn: string;
  accountName: string;
  assumeRoleExternalId?: string;
}

export interface AwsAuth {
  accessKeyId: string;
  secretAccessKey: string;
  defaultRegion: string;
  roles?: Role[];
}

export async function getCredentialsFromAuth(
  auth: any,
): Promise<AwsCredentials> {
  if (!auth.assumeRoleArn) {
    return {
      accessKeyId: auth.accessKeyId,
      secretAccessKey: auth.secretAccessKey,
      endpoint: auth.endpoint,
    };
  }

  const credentials = await assumeRole(
    auth.accessKeyId,
    auth.secretAccessKey,
    auth.defaultRegion,
    auth.assumeRoleArn,
    auth.assumeRoleExternalId,
  );

  return {
    accessKeyId: credentials?.AccessKeyId!,
    secretAccessKey: credentials?.SecretAccessKey!,
    sessionToken: credentials?.SessionToken,
    endpoint: auth.endpoint,
  };
}

export async function getCredentialsForAccount(
  auth: any,
  accountId?: string,
): Promise<AwsCredentials> {
  const credentialsList = await getCredentialsListFromAuth(
    auth,
    accountId ? [accountId] : [],
  );

  return credentialsList[0];
}

export async function getCredentialsListFromAuth(
  auth: any,
  accountIds?: string[],
): Promise<AwsCredentials[]> {
  if (!auth.roles || auth.roles.length === 0) {
    return [
      {
        accessKeyId: auth.accessKeyId,
        secretAccessKey: auth.secretAccessKey,
        endpoint: auth.endpoint,
      },
    ];
  }

  const promises: Promise<any>[] = auth.roles
    .filter(
      (role: Role) =>
        accountIds?.length &&
        accountIds?.includes(parseArn(role.assumeRoleArn).accountId),
    )
    .map((role: Role) =>
      assumeRole(
        auth.accessKeyId,
        auth.secretAccessKey,
        auth.defaultRegion,
        role.assumeRoleArn,
        role.assumeRoleExternalId,
      ),
    );

  const credentials = await Promise.all(promises);

  if (credentials.length === 0) {
    throw new Error('No credentials found for accounts');
  }

  return credentials.map((credentials: any) => {
    return {
      accessKeyId: credentials?.AccessKeyId!,
      secretAccessKey: credentials?.SecretAccessKey!,
      sessionToken: credentials?.SessionToken,
      endpoint: auth.endpoint,
    };
  });
}

function createAwsAccountsDropdown(isMultiSelect: boolean) {
  return {
    accounts: Property.DynamicProperties({
      displayName: '',
      required: true,
      refreshers: ['auth'],
      props: async ({ auth }) => {
        const innerProps: { [key: string]: any } = {};
        const authProp = auth as unknown as any;
        const list = authProp?.roles ?? [];

        if (!authProp || list.length === 0) {
          innerProps['accounts'] = {};
        } else {
          const dropdownOptions = {
            disabled: false,
            options: list.map(
              (obj: { accountName: string; assumeRoleArn: string }) => ({
                label: obj.accountName,
                value: parseArn(obj.assumeRoleArn).accountId,
              }),
            ),
          };

          innerProps['accounts'] = isMultiSelect
            ? Property.StaticMultiSelectDropdown({
                displayName: 'Accounts',
                description: 'Select one or more accounts from the list',
                required: true,
                options: dropdownOptions,
              })
            : (Property.StaticDropdown({
                displayName: 'Account',
                description: 'Select a single account from the list',
                required: true,
                options: dropdownOptions,
              }) as any);
        }

        return innerProps;
      },
    }),
  };
}

export function getAwsAccountsMultiSelectDropdown() {
  return createAwsAccountsDropdown(true);
}

export function getAwsAccountsSingleSelectDropdown() {
  return createAwsAccountsDropdown(false);
}

export const amazonAuth = BlockAuth.CustomAuth({
  authProviderKey: 'AWS',
  authProviderDisplayName: 'AWS',
  authProviderLogoUrl: `https://static.openops.com/blocks/aws.png`,
  description: `
   For production usage, it is recommended to use the AWS role assigned to the hosting environment, by leaving
  the "Access Key Id" and "Secret Access Key" fields empty. ${
    isImplicitRoleEnabled
      ? ''
      : '**To enable this capability, set the environment variable "OPS_AWS_ENABLE_IMPLICIT_ROLE" to "true".** '
  }
   See [AWS documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/attach-iam-role.html) for more information.

  For local and testing purposes, you can use the classic access key and secret access key authentication.
  `,
  props: {
    defaultRegion: Property.ShortText({
      displayName: 'Default Region',
      required: true,
      defaultValue: 'us-east-1',
    }),
    accessKeyId: Property.SecretText({
      displayName:
        'Access Key ID' + (isImplicitRoleEnabled ? ' (optional)' : ''),
      required: !isImplicitRoleEnabled,
    }),
    secretAccessKey: Property.SecretText({
      displayName:
        'Secret Access Key' + (isImplicitRoleEnabled ? ' (optional)' : ''),
      required: !isImplicitRoleEnabled,
    }),
    endpoint: Property.ShortText({
      displayName: 'Custom Endpoint (optional)',
      required: false,
    }),
    roles: Property.Array({
      displayName: 'Roles',
      required: false,
      properties: {
        assumeRoleArn: Property.ShortText({
          displayName: 'Assume Role ARN',
          required: true,
        }),
        assumeRoleExternalId: Property.ShortText({
          displayName: 'Assume Role External ID',
          required: false,
        }),
        accountName: Property.ShortText({
          displayName: 'Account Alias',
          required: true,
        }),
      },
    }),
  },
  required: true,
  validate: async ({ auth }) => {
    if (!auth.defaultRegion) {
      return { valid: false, error: 'Default region is required' };
    }

    if (!auth.accessKeyId && !isImplicitRoleEnabled) {
      return { valid: false, error: 'Access Key ID is required' };
    }

    if (!auth.secretAccessKey && !isImplicitRoleEnabled) {
      return { valid: false, error: 'Secret Access Key is required' };
    }

    return { valid: true };
  },
});

export function getRoleForAccount(
  auth: any,
  accountId: string,
): Role | undefined {
  if (!auth.roles || auth.roles.length === 0) {
    return undefined;
  }

  const role = auth.roles?.find(
    (role: Role) => parseArn(role.assumeRoleArn).accountId === accountId,
  );
  if (!role) {
    throw new Error('Role not found for account');
  }
  return role;
}
