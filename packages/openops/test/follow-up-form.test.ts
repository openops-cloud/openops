import {
  parseFollowUpForm,
  resolveButtonForm,
} from '../src/lib/follow-up-form';

const exceptionForm = {
  title: 'Request an exception',
  subtitle: 'sqlserver-rds-dev',
  fields: [
    {
      name: 'reason',
      label: 'Exception reason',
      type: 'select',
      options: ['VendorSet', 'Decommissioning'],
    },
    {
      name: 'justification',
      label: 'Justification',
      type: 'textarea',
      hint: 'Explain why this resource needs the exception',
    },
  ],
};

describe('parseFollowUpForm', () => {
  test('returns the form with every field required by default', () => {
    expect(parseFollowUpForm(exceptionForm)).toEqual({
      title: 'Request an exception',
      subtitle: 'sqlserver-rds-dev',
      fields: [
        {
          name: 'reason',
          label: 'Exception reason',
          type: 'select',
          options: ['VendorSet', 'Decommissioning'],
          required: true,
        },
        {
          name: 'justification',
          label: 'Justification',
          type: 'textarea',
          hint: 'Explain why this resource needs the exception',
          required: true,
        },
      ],
    });
  });

  test('keeps an explicit optional field and the skip label', () => {
    const form = parseFollowUpForm({
      fields: [
        {
          name: 'answer',
          label: 'Owner email',
          type: 'email',
          required: false,
        },
      ],
      skipLabel: "I don't know the owner",
    });

    expect(form.fields[0].required).toBe(false);
    expect(form.skipLabel).toBe("I don't know the owner");
  });

  test('trims text and drops empty and repeated dropdown values', () => {
    const form = parseFollowUpForm({
      title: '  Heading  ',
      fields: [
        {
          name: 'reason',
          label: ' Reason ',
          type: 'select',
          options: [' A ', '', 'B', 'A'],
        },
      ],
    });

    expect(form.title).toBe('Heading');
    expect(form.fields[0].label).toBe('Reason');
    expect(form.fields[0].options).toEqual(['A', 'B']);
  });

  test('turns number dropdown values into text', () => {
    const form = parseFollowUpForm({
      fields: [
        {
          name: 'months',
          label: 'Months',
          type: 'select',
          options: [3, 6, '12'],
        },
      ],
    });

    expect(form.fields[0].options).toEqual(['3', '6', '12']);
  });

  test.each([
    ['a form that is not an object', 'just text'],
    ['a form without fields', { title: 'x' }],
    ['a form with no fields', { fields: [] }],
    [
      'a field without a label',
      { fields: [{ name: 'a', label: ' ', type: 'text' }] },
    ],
    [
      'a field with an unknown type',
      { fields: [{ name: 'a', label: 'A', type: 'date' }] },
    ],
    [
      'a field name with spaces',
      { fields: [{ name: 'a b', label: 'A', type: 'text' }] },
    ],
    [
      'two fields with the same name',
      {
        fields: [
          { name: 'a', label: 'A', type: 'text' },
          { name: 'a', label: 'B', type: 'text' },
        ],
      },
    ],
    [
      'a dropdown without values',
      { fields: [{ name: 'a', label: 'A', type: 'select', options: [] }] },
    ],
  ])('rejects %s', (_case, value) => {
    expect(() => parseFollowUpForm(value)).toThrow(/Invalid follow-up form/);
  });

  test.each(['button', 'path', 'actionClicked', 'userName', 'isTest'])(
    'rejects the field name %s, which the resume link already uses',
    (name) => {
      expect(() =>
        parseFollowUpForm({ fields: [{ name, label: 'A', type: 'text' }] }),
      ).toThrow(`Invalid follow-up form: field name "${name}" is reserved`);
    },
  );
});

describe('resolveButtonForm', () => {
  test.each([undefined, null, '', {}])(
    'treats a followUpForm of %p as no form',
    (followUpForm) => {
      expect(resolveButtonForm({ followUpForm }, 'Header')).toBeUndefined();
    },
  );

  test('leaves a form without a title without a heading', () => {
    const form = resolveButtonForm(
      {
        followUpForm: {
          fields: [{ name: 'answer', label: 'Email', type: 'email' }],
        },
      },
      'Cost savings opportunity: vol-123',
    );

    expect(form?.title).toBeUndefined();
  });

  test("keeps the form's own heading", () => {
    const form = resolveButtonForm({ followUpForm: exceptionForm }, 'Header');

    expect(form?.title).toBe('Request an exception');
  });

  test('rejects an invalid form', () => {
    expect(() =>
      resolveButtonForm({ followUpForm: { fields: [] } }, 'Header'),
    ).toThrow(/Invalid follow-up form/);
  });

  describe('buttons from flows built before forms existed', () => {
    test('turns the single follow-up question into a one-field form answered as "answer"', () => {
      const form = resolveButtonForm(
        {
          followUpQuestion: "What is the correct owner's email?",
          answerFormat: 'email',
          noAnswerOption: "I don't know the owner",
        },
        'Cost savings opportunity: vol-123',
      );

      expect(form).toEqual({
        title: 'Cost savings opportunity: vol-123',
        fields: [
          {
            name: 'answer',
            label: "What is the correct owner's email?",
            type: 'email',
            required: true,
          },
        ],
        skipLabel: "I don't know the owner",
      });
    });

    test.each([undefined, 'dropdown'])(
      'uses a text field when the answer format is %p',
      (answerFormat) => {
        const form = resolveButtonForm({
          followUpQuestion: 'Why?',
          answerFormat,
        });

        expect(form?.fields[0].type).toBe('text');
        expect(form?.skipLabel).toBeUndefined();
      },
    );

    test('ignores an empty question', () => {
      expect(resolveButtonForm({ followUpQuestion: '   ' })).toBeUndefined();
    });

    test('prefers the form when a button has both', () => {
      const form = resolveButtonForm({
        followUpForm: exceptionForm,
        followUpQuestion: 'Ignored?',
      });

      expect(form?.fields.map((field) => field.name)).toEqual([
        'reason',
        'justification',
      ]);
    });
  });
});
