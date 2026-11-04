import { createCustomApiCallAction } from '@openops/blocks-common';
import { Property } from '@openops/blocks-framework';
import { optscaleAuth } from '../auth';
import { getRestApiUrl, OptScaleAuth, signIn } from '../common/make-request';

export async function customApiCallAuthMapping({
  auth,
}: {
  auth: unknown;
}): Promise<Record<string, string>> {
  const token = await signIn(auth as OptScaleAuth);

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export const customApiCallAction = createCustomApiCallAction({
  name: 'optscale_custom_api_call',
  displayName: 'Custom OptScale API Call',
  description: 'Make a custom call to the OptScale REST API',
  auth: optscaleAuth,
  baseUrl: (auth) => getRestApiUrl(auth as OptScaleAuth),
  authMapping: customApiCallAuthMapping,
  additionalProps: {
    documentation: Property.MarkDown({
      value:
        'For more information, see the OptScale API documentation at `<your OptScale URL>/restapi/v2/swagger/spec.html` and the [OptScale repository](https://github.com/hystax/optscale).',
    }),
  },
});
