import { BlockAuth, Property, Validators } from '@openops/blocks-framework';
import { AnodotTokens, authenticateUserWithAnodot } from './common/auth';
import { getAnodotUsers } from './common/users';

export const anadotAuth = BlockAuth.CustomAuth({
  description: 'The authentication to use to connect to Umbrella',
  required: true,
  props: {
    authUrl: Property.ShortText({
      displayName: 'Authentication URL',
      description: 'The URL to use to authenticate',
      required: true,
      validators: [Validators.url],
      defaultValue: 'https://tokenizer.mypileus.io/prod',
    }),
    apiUrl: Property.ShortText({
      displayName: 'API URL',
      description: 'The URL to use to request Umbrella API',
      required: true,
      validators: [Validators.url],
      defaultValue: 'https://api.umbrellacost.io/api/v1',
    }),
    username: Property.ShortText({
      required: true,
      displayName: 'Username',
      description: 'The username to use to connect to Umbrella',
    }),
    password: BlockAuth.SecretText({
      required: true,
      displayName: 'Password',
      description: 'The password to use to connect to Umbrella',
    }),
  },
  validate: async ({ auth }) => {
    let anodotTokens: AnodotTokens;
    try {
      anodotTokens = await authenticateUserWithAnodot(
        auth.authUrl,
        auth.username,
        auth.password,
      );
    } catch (e) {
      return {
        valid: false,
        error: 'Error validating authentication.',
      };
    }

    try {
      await getAnodotUsers(auth.apiUrl, anodotTokens);
    } catch (e) {
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
