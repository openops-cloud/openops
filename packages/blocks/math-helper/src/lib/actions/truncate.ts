import { BlockAuth, Property, createAction } from '@openops/blocks-framework';

export const truncate = createAction({
  name: 'truncate_math',
  auth: BlockAuth.None(),
  displayName: 'Truncate',
  description: 'Truncate the number to a specified number of decimal places',
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
    number: Property.Number({
      displayName: 'Number to Truncate',
      description: undefined,
      required: true,
    }),
    numberOfDecimalPlaces: Property.Number({
      displayName: 'Number of Decimal Places',
      description: undefined,
      required: true,
    }),
  },
  async run(context) {
    return context.propsValue['number'].toFixed(
      context.propsValue['numberOfDecimalPlaces'],
    );
  },
});
