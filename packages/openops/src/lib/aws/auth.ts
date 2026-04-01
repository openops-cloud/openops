/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import { BlockAuth, Property } from '@openops/blocks-framework';
import { SharedSystemProp, system } from '@openops/server-shared';
import { parseArn } from './arn-handler';
import { assumeRole, getAccountId } from './sts-common';

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

/* eslint-disable @typescript-eslint/no-explicit-any */
function sanitizeAwsError(errorMessage: string): string {
  let sanitized = errorMessage;

  // Redact IAM principal names in ARNs to prevent infrastructure disclosure
  // Covers: IAM users, roles, service roles, policies, and assumed roles
  // Example: "User: arn:aws:iam::123:user/OpenOpsApp" -> "User: arn:aws:iam::*****:user/****"

  // Pattern 1: "User:" or "Role:" prefix in error messages
  sanitized = sanitized.replace(
    /(User|Role): arn:aws:(iam|sts)::\d{12}:(user|role|assumed-role|policy)\/[^\s,]+/g,
    '$1: arn:aws:$2::*****:$3/****',
  );

  // Pattern 2: "on resource:" prefix in error messages
  sanitized = sanitized.replace(
    /on resource: arn:aws:(iam|sts)::\d{12}:(user|role|assumed-role|policy)\/[^\s,]+/g,
    'on resource: arn:aws:$1::*****:$2/****',
  );

  // Pattern 3: Catch any remaining IAM/STS ARNs with paths (service-role, etc.)
  sanitized = sanitized.replace(
    /arn:aws:(iam|sts)::\d{12}:(user|role|assumed-role|policy)\/[^\s,)]+/g,
    'arn:aws:$1::*****:$2/****',
  );

  return sanitized;
}

async function validateRequiredFields(
  auth: any,
): Promise<{ valid: true } | { valid: false; error: string }> {
  if (!auth.defaultRegion) {
    return { valid: false, error: 'Default region is required' };
  }

  const hasCredentials = auth.accessKeyId && auth.secretAccessKey;
  if (!hasCredentials && !isImplicitRoleEnabled) {
    return {
      valid: false,
      error: 'Access Key ID and Secret Access Key are required',
    };
  }

  return { valid: true };
}

async function validateBaseCredentials(
  auth: any,
): Promise<{ valid: true } | { valid: false; error: string }> {
  try {
    const credentials = {
      accessKeyId: auth.accessKeyId || '',
      secretAccessKey: auth.secretAccessKey || '',
      endpoint: auth.endpoint,
    };
    await getAccountId(credentials, auth.defaultRegion);
    return { valid: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return {
      valid: false,
      error: sanitizeAwsError(errorMessage),
    };
  }
}

async function validateRoleAssumptions(
  auth: any,
): Promise<{ valid: true } | { valid: false; error: string }> {
  if (!auth.roles || auth.roles.length === 0) {
    return { valid: true };
  }

  const accessKeyId = auth.accessKeyId || '';
  const secretAccessKey = auth.secretAccessKey || '';

  for (const role of auth.roles as Role[]) {
    try {
      await assumeRole(
        accessKeyId,
        secretAccessKey,
        auth.defaultRegion,
        role.assumeRoleArn,
        role.assumeRoleExternalId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        valid: false,
        error: `role "${role.assumeRoleArn}" (${
          role.accountName
        }): ${sanitizeAwsError(errorMessage)}`,
      };
    }
  }

  return { valid: true };
}

export const amazonAuth = BlockAuth.CustomAuth({
  authProviderKey: 'AWS',
  authProviderDisplayName: 'AWS',
  authProviderLogoUrl: `/blocks/aws.png`,
  description: `
 **🧪 Sandbox or evaluation environment**
 <br>You may use access key credentials by manually providing both the Access Key ID and Secret Access Key.


 **🔐 Production environment**<br>
Use the AWS IAM role assigned to the hosting environment:
- Set the environment variable in your installation: **OPS_AWS_ENABLE_IMPLICIT_ROLE=true**. Refer to [OpenOps docs](https://docs.openops.com/cloud-access/access-levels-permissions#connecting-using-an-iam-role-attached-to-your-ec2-instance) for details.
- Leave "Access Key ID" and "Secret Access Key" empty.


 **🏆 Enterprise capabilities (Paid Offering, Ideal for enterprise-scale environments)**<br>
For large or complex setups, enhanced features are available, including:
- Automatic account discovery
- Integration with secret management systems for credential handling
<br>
 [Explore our commercial offering](https://www.openops.com/pricing/)
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
    const fieldValidation = await validateRequiredFields(auth);
    if (!fieldValidation.valid) {
      return fieldValidation;
    }

    const baseCredentialsValidation = await validateBaseCredentials(auth);
    if (!baseCredentialsValidation.valid) {
      return baseCredentialsValidation;
    }

    const roleValidation = await validateRoleAssumptions(auth);
    if (!roleValidation.valid) {
      return roleValidation;
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
