import { BlockAuth, createAction, Property } from '@openops/blocks-framework';
import Decimal from 'decimal.js';

export const subtraction = createAction({
  name: 'subtraction_math',
  auth: BlockAuth.None(),
  displayName: 'Subtraction',
  description: 'Subtract the first number from the second number',
  errorHandlingOptions: {
    continueOnFailure: {
      hide: true,
    },
    retryOnFailure: {
      hide: true,
    },
  },
  props: {
    first_number: Property.Number({
      displayName: 'First Number',
      description: undefined,
      required: true,
    }),
    second_number: Property.Number({
      displayName: 'Second Number',
      description: undefined,
      required: true,
    }),
  },
  async run(context) {
    const { first_number, second_number } = context.propsValue;
    return Decimal.sub(second_number, first_number).toNumber();
  },
});
