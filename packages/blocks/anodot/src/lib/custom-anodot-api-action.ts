import { createCustomApiCallAction } from '@openops/blocks-common';
import { accountSingleSelectProperty } from './account-property';
import { anadotAuth } from './anodot-auth-property';
import {
  buildUserAccountApiKey,
  createAnodotAuthHeaders,
} from './common/anodot-requests-helpers';
import { authenticateUserWithAnodot } from './common/auth';

export const customAnodotApiAction = createCustomApiCallAction({
  auth: anadotAuth,
  name: 'custom_anodot_api_action',
  description: 'Call Umbrella API',
  displayName: 'Custom Umbrella API Action',
  baseUrl: (auth: any) => auth.apiUrl,
  additionalProps: {
    selectedAccount: accountSingleSelectProperty(),
  },
  authMapping: async (context: any) => {
    const { authUrl, username, password } = context.auth;
    const anodotTokens = await authenticateUserWithAnodot(
      authUrl,
      username,
      password,
    );
    return createAnodotAuthHeaders(
      anodotTokens.Authorization,
      buildUserAccountApiKey(
        anodotTokens.apikey,
        (context.propsValue.selectedAccount as any).accountKey,
        (context.propsValue.selectedAccount as any).divisionId,
      ),
    );
  },
});
