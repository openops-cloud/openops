import { Property, createAction } from '@openops/blocks-framework';
import {
  addSubtractTime,
  createNewDate,
  getDateInformation,
  optionalTimeFormats,
  timeFormat,
  timeFormatDescription,
} from '../common';

export const addSubtractDateAction = createAction({
  name: 'add_subtract_date',
  displayName: 'Add/Subtract Time',
  description: 'Add or subtract time from a date',
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
    inputDate: Property.ShortText({
      displayName: 'Input Date',
      description: 'Enter the input date',
      required: true,
    }),
    inputDateFormat: Property.StaticDropdown({
      displayName: 'From Time Format',
      description: timeFormatDescription,
      options: {
        options: optionalTimeFormats,
      },
      required: true,
      defaultValue: timeFormat.format07,
    }),
    outputFormat: Property.StaticDropdown({
      displayName: 'To Time Format',
      description: timeFormatDescription,
      options: {
        options: optionalTimeFormats,
      },
      required: true,
      defaultValue: timeFormat.format07,
    }),
    expression: Property.LongText({
      displayName: 'Expression',
      description: `Provide an expression to add or subtract using the following units (year, month, day, hour, minute, or second). Examples:
      + 2 second + 1 hour
      - 1 year - 3 day - 2 month
      + 5 minute`,
      required: true,
    }),
  },
  async run(context) {
    const inputDate = context.propsValue.inputDate;
    if (typeof inputDate !== 'string') {
      throw new Error(
        `Input date is not a string \ninput date: ${JSON.stringify(inputDate)}`,
      );
    }
    const inputDateFormat = context.propsValue.inputDateFormat;
    if (typeof inputDateFormat !== 'string') {
      throw new Error(
        `Input format is not a string \ninput format: ${JSON.stringify(
          inputDate,
        )}`,
      );
    }
    const outputFormat = context.propsValue.outputFormat;
    if (typeof outputFormat !== 'string') {
      throw new Error(
        `Output format is not a string \noutput format: ${JSON.stringify(
          inputDate,
        )}`,
      );
    }
    const expression = context.propsValue.expression;
    if (typeof expression !== 'string') {
      throw new Error(
        `Expression is not a string \nexpression: ${JSON.stringify(inputDate)}`,
      );
    }
    const DateInfo = getDateInformation(inputDate, inputDateFormat);
    const BeforeDate = new Date(
      DateInfo.year,
      DateInfo.month - 1,
      DateInfo.day,
      DateInfo.hour,
      DateInfo.minute,
      DateInfo.second,
    );
    const AfterDate = addSubtractTime(BeforeDate, expression);

    return createNewDate(AfterDate, outputFormat);
  },
});
