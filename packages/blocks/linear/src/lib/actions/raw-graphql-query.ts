import { createAction, Property } from '@openops/blocks-framework';
import { linearAuth } from '../..';
import { makeClient } from '../common/client';

export const linearRawGraphqlQuery = createAction({
  name: 'rawGraphqlQuery',
  displayName: 'Raw GraphQL query',
  description: 'Perform a raw GraphQL query',
  auth: linearAuth,
  requireToolApproval: true,
  props: {
    query: Property.LongText({ displayName: 'Query', required: true }),
    variables: Property.Object({ displayName: 'Parameters', required: false }),
  },
  async run({ auth, propsValue }) {
    const client = makeClient(auth);
    const result = await client.rawRequest(
      propsValue.query,
      propsValue.variables,
    );
    return result;
  },
});
