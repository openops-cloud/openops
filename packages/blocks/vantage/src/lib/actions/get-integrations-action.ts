import { createAction, Property } from '@openops/blocks-framework';
import { vantageAuth } from '../auth';
import { getIntegrations, getProviders } from '../common/integrations-api';

export const getIntegrationsAction = createAction({
  auth: vantageAuth,
  name: 'vantage_get_integrations',
  description: 'Get Integrations',
  displayName: 'Get Integrations',
  props: {
    provider: Property.Dropdown({
      displayName: 'Provider',
      description: 'Filter integrations by provider',
      required: false,
      refreshers: [],
      options: async () => {
        const providers = await getProviders();

        return {
          disabled: false,
          options: providers,
        };
      },
    }),
    limit: Property.Number({
      displayName: 'Limit',
      description: 'The maximum number of integrations to return',
      required: false,
    }),
  },
  async run(context) {
    const { provider, limit } = context.propsValue;
    const integrations = await getIntegrations(context.auth, provider, limit);

    return integrations;
  },
});
