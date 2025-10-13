import { BlockAuth, Property, createAction } from '@openops/blocks-framework';
import Decimal from 'decimal.js';

export const sum = createAction({
  name: 'sum',
  auth: BlockAuth.None(),
  displayName: 'Sum',
  description: 'Return the sum of the given numbers',
  errorHandlingOptions: {
    continueOnFailure: {
      hide: true,
    },
    retryOnFailure: {
      hide: true,
    },
  },
  IsWriteAction: false,
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
      return 0;
    }

    return Decimal.sum(...numbers).toNumber();
  },
});
