import { BlockAuth, Property, createAction } from '@openops/blocks-framework';
import Decimal from 'decimal.js';

export const multiplication = createAction({
  name: 'multiplication_math',
  auth: BlockAuth.None(),
  displayName: 'Multiplication',
  description: 'Multiply first number by the second number',
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
    return Decimal.mul(first_number, second_number).toNumber();
  },
});
