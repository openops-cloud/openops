import {
  BlockAuth,
  BlockPropValueSchema,
  Property,
  Validators,
} from '@openops/blocks-framework';
import {
  createUmbrellaSession,
  otherUserManagementVersion,
  UmbrellaAuthProps,
  UmbrellaSession,
  UserManagementVersion,
} from './common/auth';
import { listUmbrellaAccounts } from './common/umbrella-accounts';

const USER_MANAGEMENT_VERSION_DISPLAY_NAME = 'User Management version';

export const anadotAuth = BlockAuth.CustomAuth({
  authProviderKey: 'Umbrella',
  authProviderDisplayName: 'Umbrella',
  authProviderLogoUrl: `/blocks/umbrella.png`,
  description: 'The authentication to use to connect to Umbrella',
  required: true,
  props: {
    userManagementVersion: Property.StaticDropdown({
      displayName: USER_MANAGEMENT_VERSION_DISPLAY_NAME,
      description:
        'Select the User Management version of your Umbrella tenant.',
      required: false,
      defaultValue: '2.0',
      options: {
        options: [
          { label: 'User Management 2.0', value: '2.0' },
          { label: 'User Management 1.0', value: '1.0' },
        ],
      },
    }),
    authUrl: Property.ShortText({
      displayName: 'Authentication URL',
      description:
        'The URL to use to authenticate. Only used for User Management 1.0.',
      required: true,
      validators: [Validators.url],
      defaultValue: 'https://tokenizer.mypileus.io/prod',
    }),
    apiUrl: Property.ShortText({
      displayName: 'API URL',
      description: 'The URL to use to request Umbrella API',
      required: true,
      validators: [Validators.url],
      defaultValue: 'https://api.umbrellacost.io/api',
    }),
    username: Property.ShortText({
      required: true,
      displayName: 'Username',
      description: 'The username to use to connect to Umbrella',
    }),
    password: Property.SecretText({
      required: true,
      displayName: 'Password',
      description: 'The password to use to connect to Umbrella',
    }),
  },
  validate: async ({ auth }) => {
    let session: UmbrellaSession;
    try {
      session = await createUmbrellaSession(auth);
    } catch {
      return {
        valid: false,
        error: 'Error validating authentication.',
      };
    }

    try {
      await listUmbrellaAccounts(session);
    } catch {
      const otherVersion = otherUserManagementVersion(session.version);
      if (await canListAccountsWithVersion(auth, otherVersion)) {
        return {
          valid: false,
          error: `This user appears to be on User Management ${otherVersion}. Change the '${USER_MANAGEMENT_VERSION_DISPLAY_NAME}' setting.`,
        };
      }

      return {
        valid: false,
        error: 'Error validating API access.',
      };
    }

    return {
      valid: true,
    };
  },
});

export type UmbrellaAuth = BlockPropValueSchema<typeof anadotAuth>;

/**
 * Probes the other User Management version end to end (login and account
 * listing). Both steps are deliberately inside one try/catch: the selected
 * version's login has already succeeded, so a failure here is never an
 * authentication problem to report, only a signal that the hint does not apply.
 */
async function canListAccountsWithVersion(
  auth: UmbrellaAuthProps,
  version: UserManagementVersion,
): Promise<boolean> {
  try {
    const session = await createUmbrellaSession(auth, version);
    await listUmbrellaAccounts(session);
    return true;
  } catch {
    return false;
  }
}
