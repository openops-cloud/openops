import { BlockAuth, Property, createAction } from '@openops/blocks-framework';
import Decimal from 'decimal.js';

export const min = createAction({
  name: 'min',
  auth: BlockAuth.None(),
  displayName: 'Minimum',
  description: 'Return the minimum of the given numbers',
  errorHandlingOptions: {
    continueOnFailure: {
      hide: true,
    },
    retryOnFailure: {
      hide: true,
    },
  },
  requireToolApproval: false,
  props: {
    numbers: Property.Array({
      displayName: 'Numbers',
      description: undefined,
      required: true,
    }),
  },
  async run(context) {
    if (!Array.isArray(context.propsValue['numbers'])) {
      throw new Error('Numbers must be an array');
    }

    const numbers = context.propsValue['numbers'] as [];

    if (!numbers.length) {
      return undefined;
    }

    return Decimal.min(...numbers).toNumber();
  },
});
