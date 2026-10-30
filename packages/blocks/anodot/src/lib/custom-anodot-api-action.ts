import { createCustomApiCallAction } from '@openops/blocks-common';
import { accountSingleSelectProperty } from './account-property';
import { anadotAuth, UmbrellaAuth } from './anodot-auth-property';
import { SelectedAccount } from './common/account';
import {
  buildAccountApiKeyForAccount,
  createAnodotAuthHeaders,
} from './common/anodot-requests-helpers';
import { createUmbrellaSession } from './common/auth';

export const customAnodotApiAction = createCustomApiCallAction({
  auth: anadotAuth,
  name: 'custom_anodot_api_action',
  description: 'Call Umbrella API',
  displayName: 'Custom Umbrella API Action',
  baseUrl: (auth?: unknown) => (auth as UmbrellaAuth | undefined)?.apiUrl ?? '',
  additionalProps: {
    selectedAccount: accountSingleSelectProperty(),
  },
  authMapping: async (context: { auth: unknown; propsValue: unknown }) => {
    const session = await createUmbrellaSession(context.auth as UmbrellaAuth);
    const { selectedAccount } = context.propsValue as {
      selectedAccount: SelectedAccount;
    };

    return createAnodotAuthHeaders(
      session.tokens.Authorization,
      buildAccountApiKeyForAccount(session.tokens.apikey, selectedAccount),
    );
  },
});
