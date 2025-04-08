import {
  BlockAuth,
  createAction,
  Property,
  Validators,
} from '@openops/blocks-framework';
import Decimal from 'decimal.js';

export const division = createAction({
  name: 'division_math',
  auth: BlockAuth.None(),
  displayName: 'Division',
  description: 'Divide first number by the second number',
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
      validators: [Validators.nonZero],
    }),
  },
  async run(context) {
    const { first_number, second_number } = context.propsValue;
    return Decimal.div(first_number, second_number).toNumber();
  },
});
