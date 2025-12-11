import { BlockAuth, Property, Validators, WorkflowFile } from '@openops/blocks-framework';
import { propsProcessor } from '../../src/lib/variables/props-processor';

describe('Props Processor', () => {
  it('should return base64 from base64 with mime only', async () => {
    const input = {
      base64WithMime: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAiAAAAC4CAYAAADaI1cbAAA0h0lEQVR4AezdA5AlPx7A8Zxt27Z9r5PB2SidWTqbr26S9Hr/tm3btu3723eDJD3r15ec17vzXr+Z',
      base64: 'iVBORw0KGgoAAAANSUhEUgAAAiAAAAC4CAYAAADaI1cbAAA0h0lEQVR4AezdA5AlPx7A8Zxt27Z9r5PB2SidWTqbr26S9Hr/tm3btu3723eDJD3r15ec17vzXr+Z',
    };
    const props = {
      base64WithMime: Property.File({
        displayName: 'Base64WithMime',
        required: true,
      }),
      base64: Property.File({
        displayName: 'Base64',
        required: true,
      }),
    };
    const {
      processedInput,
      errors,
    } = await propsProcessor.applyProcessorsAndValidators(input, props, BlockAuth.None(), false);
    expect(processedInput).toEqual({
      base64: null,
      base64WithMime: new WorkflowFile('unknown.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAiAAAAC4CAYAAADaI1cbAAA0h0lEQVR4AezdA5AlPx7A8Zxt27Z9r5PB2SidWTqbr26S9Hr/tm3btu3723eDJD3r15ec17vzXr+Z', 'base64'), 'png'),
    });
    expect(errors).toEqual({
      'Base64': [
        'Expected a file url or base64 with mimeType, received: iVBORw0KGgoAAAANSUhEUgAAAiAAAAC4CAYAAADaI1cbAAA0h0lEQVR4AezdA5AlPx7A8Zxt27Z9r5PB2SidWTqbr26S9Hr/tm3btu3723eDJD3r15ec17vzXr+Z',
      ],
    });
  });

  // Test with invalid url
  it('should return error for invalid data', async () => {
    const input = {
      file: 'https://google.com',
      nullFile: null,
      nullOptionalFile: null,
    };
    const props = {
      file: Property.File({
        displayName: 'File',
        required: true,
      }),
      nullFile: Property.File({
        displayName: 'File',
        required: true,
      }),
      nullOptionalFile: Property.File({
        displayName: 'File',
        required: false,
      }),
    };
    const {
      processedInput,
      errors,
    } = await propsProcessor.applyProcessorsAndValidators(input, props, BlockAuth.None(), false);
    expect(processedInput.file).toBeDefined();
    expect(processedInput.file.extension).toBe('html');
    expect(processedInput.file.filename).toBe('unknown.html');
    expect(processedInput.nullFile).toBeNull();
    expect(processedInput.nullOptionalFile).toBeNull();
    expect(errors).toEqual({
      'File': [
        'Expected a file url or base64 with mimeType, received: null',
      ],
    });
  });


  it('should return casted number for text', async () => {
    const input = {
      price: '0',
      auth: {
        age: '12',
      },
    };
    const props = {
      price: Property.Number({
        displayName: 'Price',
        required: true,
      }),
    };
    const {
      processedInput,
      errors,
    } = await propsProcessor.applyProcessorsAndValidators(input, props, BlockAuth.CustomAuth({
      authProviderKey: 'SMTP',
      authProviderDisplayName: 'SMTP',
      authProviderLogoUrl: `https://static.openops.com/blocks/smtp.png`,
      required: true,
      props: {
        age: Property.Number({
          displayName: 'age',
          required: true,
        }),
      },
    }), true);

    expect(processedInput).toEqual({
      auth: {
        age: 12,
      },
      price: 0,
    });
    expect(errors).toEqual({});
  });

  it('should return errors for invalid number', async () => {
    const input = {
      price: 'wrong text',
      auth: {
        age: 'wrong text',
      },
      emptyStringNumber: '',
      undefinedNumber: undefined,
      nullNumber: null,
      optionalNullNumber: null,
      optionalUndefinedNumber: undefined,
    };
    const props = {
      emptyStringNumber: Property.Number({
        displayName: 'Empty String Number',
        required: true,
      }),
      optionalNullNumber: Property.Number({
        displayName: 'Null Number',
        required: false,
      }),
      optionalUndefinedNumber: Property.Number({
        displayName: 'Number',
        required: false,
      }),
      nullNumber: Property.Number({
        displayName: 'Null Number',
        required: true,
      }),
      undefinedNumber: Property.Number({
        displayName: 'Number',
        required: true,
      }),
      price: Property.Number({
        displayName: 'Price',
        required: true,
      }),
    };
    const {
      processedInput,
      errors,
    } = await propsProcessor.applyProcessorsAndValidators(input, props, BlockAuth.CustomAuth({
      authProviderKey: 'SMTP',
      authProviderDisplayName: 'SMTP',
      authProviderLogoUrl: `https://static.openops.com/blocks/smtp.png`,
      required: true,
      props: {
        age: Property.Number({
          displayName: 'age',
          required: true,
        }),
      },
    }), true);
    expect(processedInput).toEqual({
      price: Number.NaN,
      emptyStringNumber: Number.NaN,
      nullNumber: null,
      undefinedNumber: undefined,
      optionalNullNumber: null,
      optionalUndefinedNumber: undefined,
      auth: {
        age: Number.NaN,
      },
    });
    expect(errors).toEqual({
      Price: ['Expected a number, received: wrong text'],
      'Empty String Number': ['Expected a number, received: '],
      'Null Number': ['Expected a number, received: null'],
      auth: {
        age: ['Expected a number, received: wrong text'],
      },
      'Number': [
        'Expected a number, received: undefined',
      ],
    });
  });

  it('should return proper iso date time for valid texts', async () => {
    const input = {
      Salesforce: '2022-12-27T09:48:06.000+0000',
      Microsoft1: '2022-12-14T02:30:00.0000000',
      Microsoft2: '2022-12-30T10:15:36.6778769Z',
      Asana1: '2012-02-22T02:06:58.147Z',
      Asana2: '2012-02-22',
      Hubspot: '2019-10-30T03:30:17.883Z',
      FormatOne: '2023-05-23Z',
      FormatTwo: 'May 23, 2023Z',
      FormatThree: '05/23/2023Z',
      FormatFour: '2023-05-23T12:34:56',
      FormatFive: '2023-05-23 12:34:56',
    };
    const props = {
      Salesforce: Property.DateTime({
        displayName: 'Salesforce',
        required: true,
      }),
      Microsoft1: Property.DateTime({
        displayName: 'Microsoft1',
        required: true,
      }),
      Microsoft2: Property.DateTime({
        displayName: 'Microsoft2',
        required: true,
      }),
      Asana1: Property.DateTime({
        displayName: 'Asana1',
        required: true,
      }),
      Asana2: Property.DateTime({
        displayName: 'Asana2',
        required: true,
      }),
      Hubspot: Property.DateTime({
        displayName: 'Hubspot',
        required: true,
      }),
      FormatOne: Property.DateTime({
        displayName: 'One',
        required: true,
      }),
      FormatTwo: Property.DateTime({
        displayName: 'One',
        required: true,
      }),
      FormatThree: Property.DateTime({
        displayName: 'One',
        required: true,
      }),
      FormatFour: Property.DateTime({
        displayName: 'One',
        required: true,
      }),
      FormatFive: Property.DateTime({
        displayName: 'One',
        required: true,
      }),
    };
    const {
      processedInput,
      errors,
    } = await propsProcessor.applyProcessorsAndValidators(input, props, BlockAuth.None(), false);
    expect(processedInput).toEqual({
      Asana1: '2012-02-22T02:06:58.147Z',
      Asana2: '2012-02-22T00:00:00.000Z',
      FormatFive: '2023-05-23T12:34:56.000Z',
      FormatFour: '2023-05-23T12:34:56.000Z',
      FormatOne: '2023-05-23T00:00:00.000Z',
      FormatThree: '2023-05-23T00:00:00.000Z',
      FormatTwo: '2023-05-23T00:00:00.000Z',
      Hubspot: '2019-10-30T03:30:17.883Z',
      Microsoft1: '2022-12-14T02:30:00.000Z',
      Microsoft2: '2022-12-30T10:15:36.677Z',
      Salesforce: '2022-12-27T09:48:06.000Z',
    });
    expect(errors).toEqual({});
  });

  it('should return error for invalid texts for iso dates', async () => {
    const input = {
      invalidDateString: 'wrong text',
      wrongDateString: '2023-023-331',
      emptyDateString: '',
      undefinedDate: undefined,
      nullDate: null,
    };
    const props = {
      invalidDateString: Property.DateTime({
        displayName: 'Invalid Date String',
        required: true,
      }),
      wrongDateString: Property.DateTime({
        displayName: 'Wrong Date String',
        required: true,
      }),
      emptyDateString: Property.DateTime({
        displayName: 'Empty Date string',
        required: true,
      }),
      undefinedDate: Property.DateTime({
        displayName: 'Undefined Date string',
        required: true,
      }),
      nullDate: Property.DateTime({
        displayName: 'Null Number',
        required: true,
      }),
    };
    const {
      processedInput,
      errors,
    } = await propsProcessor.applyProcessorsAndValidators(input, props, BlockAuth.None(), false);

    expect(processedInput).toEqual({
      invalidDateString: undefined,
      wrongDateString: undefined,
      emptyDateString: undefined,
      undefinedDate: undefined,
      nullDate: undefined,
    });
    expect(errors).toEqual({
      "Undefined Date string": [
        "Invalid datetime format. Expected ISO format (e.g. 2024-03-14T12:00:00.000Z), received: undefined"
      ],
      "Null Number": [
        "Invalid datetime format. Expected ISO format (e.g. 2024-03-14T12:00:00.000Z), received: null"
      ],
      "Invalid Date String": [
        "Invalid datetime format. Expected ISO format (e.g. 2024-03-14T12:00:00.000Z), received: wrong text"
      ],
      "Wrong Date String": [
        "Invalid datetime format. Expected ISO format (e.g. 2024-03-14T12:00:00.000Z), received: 2023-023-331"
      ],
      "Empty Date string": [
        "Invalid datetime format. Expected ISO format (e.g. 2024-03-14T12:00:00.000Z), received: "
      ]
    });

  });

  it('Test email validator', async () => {
    const input = {
      email: 'ap@dev&com',
      auth: {
        email: 'ap@dev&com',
      },
    };
    const props = {
      email: Property.LongText({
        displayName: 'Email',
        required: true,
        validators: [Validators.email],
      }),
    };
    const { errors } = await propsProcessor.applyProcessorsAndValidators(input, props, BlockAuth.CustomAuth({
      authProviderKey: 'SMTP',
      authProviderDisplayName: 'SMTP',
      authProviderLogoUrl: `https://static.openops.com/blocks/smtp.png`,
      required: true,
      props: {
        email: Property.LongText({
          displayName: 'email',
          required: true,
          validators: [Validators.email],
        }),
      },
    }), true);
    expect(errors).toEqual({
      auth: {
        email: ['Invalid Email format: ap@dev&com'],
      },
      Email: ['Invalid Email format: ap@dev&com'],
    });
  });

  it('Test url and oneOf validators', async () => {
    const input = {
      text: 'openopscom.',
    };
    const props = {
      text: Property.LongText({
        displayName: 'Text',
        required: true,
        validators: [Validators.url, Validators.oneOf(['openops.com', 'www.openops.com'])],
      }),
    };
    const { errors } = await propsProcessor.applyProcessorsAndValidators(input, props, BlockAuth.None(), false);
    expect(errors).toEqual({
      Text: [
        'The value: openopscom. is not a valid URL',
        'The openopscom. is not a valid value, valid choices are: openops.com,www.openops.com',
      ],
    });
  });

  it('Test minLength and maxLength validators', async () => {
    const input = {
      textValid: 'short',
      text1: 'short',
      text2: 'short1234678923145678',
    };
    const props = {
      textValid: Property.LongText({
        displayName: 'Text',
        required: true,
        validators: [Validators.minLength(2)],
      }),
      text1: Property.LongText({
        displayName: 'Text 1',
        required: true,
        validators: [Validators.minLength(10)],
      }),
      text2: Property.LongText({
        displayName: 'Text 2',
        required: true,
        validators: [Validators.maxLength(10)],
      }),
    };
    const { errors } = await propsProcessor.applyProcessorsAndValidators(input, props, BlockAuth.None(), false);
    expect(errors).toEqual({
      'Text 1': ['The value: short must be at least 10 characters'],
      'Text 2': ['The value: short1234678923145678 may not be greater than 10 characters'],
    });
  });

  it('Test maxValue, inRange, minValue and oneOf valdiators', async () => {
    const choices = {
      VAL1: 1,
      VAL2: 2,
    };
    const input = {
      value1: 40,
      value2: 4,
      value3: '4',
    };
    const props = {
      value1: Property.Number({
        displayName: 'Age 1',
        required: true,
        validators: [Validators.maxValue(2), Validators.oneOf(Object.values(choices))],
      }),
      value2: Property.Number({
        displayName: 'Age 2',
        required: true,
        validators: [Validators.inRange(5, 10)],
      }),
      value3: Property.Number({
        displayName: 'Age 3',
        required: true,
        validators: [Validators.minValue(10)],
      }),
    };
    const { errors } = await propsProcessor.applyProcessorsAndValidators(input, props, BlockAuth.None(), false);
    expect(errors).toEqual({
      'Age 1': ['The value: 40 must be 2 or less', 'The 40 is not a valid value, valid choices are: 1,2'],
      'Age 2': ['The value: 4 must be at least 5 and less than or equal 10'],
      'Age 3': ['The value: 4 must be 10 or more'],
    });
  });

  it('should allow empty auth if not required', async () => {
    const input = {
      auth: null,
      emptyStringNumber: '',
    };
    const props = {
      emptyStringNumber: Property.Number({
        displayName: 'Empty String Number',
        required: true,
      }),
    };
    const {
      processedInput,
      errors,
    } = await propsProcessor.applyProcessorsAndValidators(input, props, BlockAuth.CustomAuth({
      authProviderKey: 'SMTP',
      authProviderDisplayName: 'SMTP',
      authProviderLogoUrl: 'https://static.openops.com/blocks/smtp.png',
      required: false,
      props: {
        age: Property.Number({
          displayName: 'age',
          required: true,
        }),
      },
    }), true);

    expect(processedInput).toEqual({
      emptyStringNumber: Number.NaN,
      auth: {},
    });
    expect(errors).toEqual({
      'Empty String Number': ['Expected a number, received: '],
    });
  });
});
