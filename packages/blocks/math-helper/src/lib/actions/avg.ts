import { BlockAuth, Property, createAction } from '@openops/blocks-framework';
import Decimal from 'decimal.js';

export const avg = createAction({
  name: 'avg',
  auth: BlockAuth.None(),
  displayName: 'Average',
  description: 'Return the average of the given numbers',
  errorHandlingOptions: {
    continueOnFailure: {
      hide: true,
    },
    retryOnFailure: {
      hide: true,
    },
  },
  isWriteAction: false,
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

    return Decimal.sum(...numbers)
      .dividedBy(numbers.length)
      .toNumber();
  },
});
