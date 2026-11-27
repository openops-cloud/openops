import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TextDecoder } from 'node:util';
import { buildWrapperUrl } from '../src/lib/build-wrapper-url';
import {
  FOLLOW_UP_FIELD_TYPES,
  parseFollowUpForm,
  RESERVED_FOLLOW_UP_FIELD_NAMES,
} from '../src/lib/follow-up-form';

// The form page is a static file served by the frontend. These tests load it
// in a simulated browser with links built by buildWrapperUrl, so the link the
// blocks send and the page that reads it are checked together.
const PAGE_HTML = readFileSync(
  join(__dirname, '../../react-ui/public/html/collect_input.html'),
  'utf8',
);

const ORIGIN = 'https://app.example.test';
const RESUME_URL = `${ORIGIN}/api/v1/flow-runs/run-1/requests/pause-1?button=Add%20exception&path=step_1`;

const exceptionForm = parseFollowUpForm({
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
      hint: 'Explain why',
    },
    { name: 'ticket', label: 'Ticket', type: 'text', required: false },
  ],
  skipLabel: 'Not sure',
});

const openPages: JSDOM[] = [];

function openPage(url: string): Document {
  const dom = new JSDOM(PAGE_HTML, {
    url,
    runScripts: 'dangerously',
    beforeParse(window) {
      // jsdom has no TextDecoder; every supported browser does.
      Object.assign(window, { TextDecoder });
    },
  });
  openPages.push(dom);
  return dom.window.document;
}

function openForm(form: unknown, isTest = false): Document {
  const params = new URLSearchParams({
    isTest: String(isTest),
    form: Buffer.from(JSON.stringify(form), 'utf8').toString('base64url'),
    redirectUrl: RESUME_URL,
  });
  return openPage(`${ORIGIN}/html/collect_input.html?${params.toString()}`);
}

function isShown(document: Document, id: string): boolean {
  return !document.getElementById(id)?.classList.contains('hidden');
}

function control(document: Document, name: string): HTMLInputElement {
  return document.querySelector(`[name="${name}"]`) as HTMLInputElement;
}

function submit(document: Document): void {
  const form = document.getElementById('input-form') as HTMLFormElement;
  const SubmitEvent = document.defaultView?.Event as typeof Event;
  form.dispatchEvent(new SubmitEvent('submit', { cancelable: true }));
}

function shownErrors(document: Document): number {
  return [...document.querySelectorAll<HTMLElement>('.error')].filter(
    (error) => error.style.display === 'block',
  ).length;
}

function resumedWith(document: Document): Record<string, string> | null {
  const iframe = document.querySelector('iframe');
  if (!iframe) {
    return null;
  }
  const url = new URL(iframe.src);
  expect(`${url.origin}${url.pathname}`).toBe(RESUME_URL.split('?')[0]);
  return Object.fromEntries(url.searchParams);
}

afterEach(() => {
  openPages.splice(0).forEach((dom) => dom.window.close());
});

describe('collect_input.html', () => {
  describe('with a form link built by buildWrapperUrl', () => {
    const formUrl = buildWrapperUrl({
      frontendUrl: ORIGIN,
      isTest: false,
      resumeUrl: RESUME_URL,
      form: exceptionForm,
    });

    test('shows the heading, the subtitle and one input per field', () => {
      const document = openPage(formUrl);

      expect(isShown(document, 'form-view')).toBe(true);
      expect(document.querySelector('#form-view h2')?.textContent).toBe(
        'Request an exception',
      );
      expect(document.querySelector('.subtitle')?.textContent).toBe(
        'sqlserver-rds-dev',
      );
      expect(control(document, 'reason').tagName).toBe('SELECT');
      expect(
        [...document.querySelectorAll('select option')].map(
          (option) => option.textContent,
        ),
      ).toEqual(['Select…', 'VendorSet', 'Decommissioning']);
      expect(control(document, 'justification').tagName).toBe('TEXTAREA');
      expect(document.querySelector('.hint')?.textContent).toBe('Explain why');
      expect(control(document, 'ticket').type).toBe('text');
      // Required fields are marked; the optional one is not.
      expect(document.querySelectorAll('.required-mark')).toHaveLength(2);
    });

    test('shows an error per empty required field and does not resume', () => {
      const document = openPage(formUrl);

      submit(document);

      expect(shownErrors(document)).toBe(2);
      expect(resumedWith(document)).toBeNull();
      expect(isShown(document, 'done-view')).toBe(false);
    });

    test('resumes the flow with one param per field, keeping the routing params', () => {
      const document = openPage(formUrl);
      control(document, 'reason').value = 'VendorSet';
      control(document, 'justification').value = '  Migrating in February  ';

      submit(document);

      expect(resumedWith(document)).toEqual({
        button: 'Add exception',
        path: 'step_1',
        reason: 'VendorSet',
        justification: 'Migrating in February',
        ticket: '',
      });
      expect(isShown(document, 'done-view')).toBe(true);
      expect(isShown(document, 'form-view')).toBe(false);
    });

    test('sends every field back empty when the skip button is clicked', () => {
      const document = openPage(formUrl);
      const skipButton = document.getElementById('skip-button');
      expect(skipButton?.textContent).toBe('Not sure');

      skipButton?.click();

      expect(resumedWith(document)).toMatchObject({
        reason: '',
        justification: '',
        ticket: '',
      });
    });

    test('shows only the test notice in test mode', () => {
      const document = openPage(
        buildWrapperUrl({
          frontendUrl: ORIGIN,
          isTest: true,
          resumeUrl: RESUME_URL,
          form: exceptionForm,
        }),
      );

      expect(isShown(document, 'form-view')).toBe(false);
      expect(document.getElementById('done-title')?.textContent).toContain(
        'Test succeeded',
      );
      expect(resumedWith(document)).toBeNull();
    });
  });

  describe('errors', () => {
    function errorOf(document: Document, name: string): HTMLElement {
      const id = control(document, name).id;
      return document.getElementById(`${id}-error`) as HTMLElement;
    }

    function type(document: Document, name: string, value: string): void {
      const field = control(document, name);
      field.value = value;
      const InputEvent = document.defaultView?.Event as typeof Event;
      field.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }

    const form = {
      fields: [
        { name: 'email', label: 'Email', type: 'email', hint: 'Work email' },
        { name: 'months', label: 'Months', type: 'number' },
        { name: 'note', label: 'Note', type: 'text', required: false },
      ],
    };

    test('says what is wrong with each field', () => {
      const document = openForm(form);

      submit(document);

      expect(errorOf(document, 'email').textContent).toBe(
        'This field is required.',
      );
      expect(errorOf(document, 'months').textContent).toBe(
        'This field is required.',
      );
      expect(errorOf(document, 'note').style.display).toBe('none');

      type(document, 'email', 'not-an-email');
      expect(errorOf(document, 'email').textContent).toBe(
        'Enter a valid email address.',
      );
    });

    test('marks the invalid inputs and focuses the first one', () => {
      const document = openForm(form);

      submit(document);

      expect(control(document, 'email').getAttribute('aria-invalid')).toBe(
        'true',
      );
      expect(control(document, 'email').classList.contains('invalid')).toBe(
        true,
      );
      expect(control(document, 'note').hasAttribute('aria-invalid')).toBe(
        false,
      );
      expect(document.activeElement).toBe(control(document, 'email'));
    });

    test('clears an error as soon as the answer is corrected', () => {
      const document = openForm(form);
      submit(document);

      type(document, 'email', 'owner@example.com');

      expect(errorOf(document, 'email').style.display).toBe('none');
      expect(control(document, 'email').hasAttribute('aria-invalid')).toBe(
        false,
      );
      // The other field keeps its error until it is corrected too.
      expect(errorOf(document, 'months').style.display).toBe('block');
    });

    test('shows no error while typing before the first submit', () => {
      const document = openForm(form);

      type(document, 'email', 'not-an-email');

      expect(errorOf(document, 'email').style.display).not.toBe('block');
    });

    test('links each input to its hint and error for screen readers', () => {
      const document = openForm(form);
      const email = control(document, 'email');

      expect(email.getAttribute('aria-describedby')).toBe(
        `${email.id}-hint ${email.id}-error`,
      );
      expect(email.required).toBe(true);
      expect(control(document, 'note').required).toBe(false);
    });
  });

  test('has no heading and no skip button when the form sets neither', () => {
    const document = openForm({
      fields: [{ name: 'note', label: 'Note', type: 'text' }],
    });

    expect(document.querySelector('#form-view h2')).toBeNull();
    expect(isShown(document, 'skip-section')).toBe(false);
    // A single-field form shows no required mark.
    expect(document.querySelector('.required-mark')).toBeNull();
  });

  test.each([
    ['email', 'not-an-email', 'owner@example.com'],
    ['number', 'twelve', '12'],
  ])('checks the format of a %s field', (type, invalid, valid) => {
    const document = openForm({
      fields: [{ name: 'value', label: 'Value', type }],
    });

    control(document, 'value').value = invalid;
    submit(document);
    expect(resumedWith(document)).toBeNull();

    control(document, 'value').value = valid;
    submit(document);
    expect(resumedWith(document)).toMatchObject({ value: valid });
  });

  describe('with a link sent before forms existed', () => {
    const legacyUrl = `${ORIGIN}/html/collect_input.html?${new URLSearchParams({
      isTest: 'false',
      question: "What is the correct owner's email?",
      format: 'email',
      redirectUrl: RESUME_URL,
      noAnswerOption: "I don't know the owner",
      title: 'Cost savings opportunity: vol-123',
    }).toString()}`;

    test('shows the single question as before', () => {
      const document = openPage(legacyUrl);

      expect(document.querySelector('#form-view h2')?.textContent).toBe(
        'Cost savings opportunity: vol-123',
      );
      expect(document.querySelector('label')?.textContent).toBe(
        "What is the correct owner's email?",
      );
      expect(control(document, 'answer').type).toBe('email');
      expect(document.getElementById('skip-button')?.textContent).toBe(
        "I don't know the owner",
      );
    });

    test('resumes with the answer in the "answer" param', () => {
      const document = openPage(legacyUrl);
      control(document, 'answer').value = 'owner@example.com';

      submit(document);

      expect(resumedWith(document)).toMatchObject({
        answer: 'owner@example.com',
      });
    });
  });

  describe('invalid links', () => {
    test('rejects a form that cannot be read', () => {
      const params = new URLSearchParams({
        isTest: 'false',
        form: 'not-a-form',
        redirectUrl: RESUME_URL,
      });
      const document = openPage(
        `${ORIGIN}/html/collect_input.html?${params.toString()}`,
      );

      expect(isShown(document, 'invalid-view')).toBe(true);
      expect(isShown(document, 'form-view')).toBe(false);
    });

    test('rejects a resume link to another site', () => {
      const document = openPage(
        buildWrapperUrl({
          frontendUrl: ORIGIN,
          isTest: false,
          resumeUrl:
            'https://evil.example.test/v1/flow-runs/run-1/requests/pause-1',
          form: exceptionForm,
        }),
      );

      expect(isShown(document, 'invalid-view')).toBe(true);
    });

    test('treats non-text heading values as missing', () => {
      const document = openForm({
        title: 5,
        subtitle: {},
        skipLabel: 7,
        fields: [{ name: 'note', label: 'Note', type: 'text' }],
      });

      expect(isShown(document, 'form-view')).toBe(true);
      expect(document.querySelector('#form-view h2')).toBeNull();
      expect(isShown(document, 'skip-section')).toBe(false);
    });
  });

  // The page repeats the rules of follow-up-form.ts, because it is a static
  // file. These keep the two from drifting apart.
  describe('agrees with parseFollowUpForm', () => {
    test.each([...FOLLOW_UP_FIELD_TYPES])(
      'accepts the field type %s',
      (type) => {
        const document = openForm({
          fields: [{ name: 'value', label: 'Value', type, options: ['A'] }],
        });

        expect(isShown(document, 'form-view')).toBe(true);
        expect(control(document, 'value')).not.toBeNull();
      },
    );

    test.each([...RESERVED_FOLLOW_UP_FIELD_NAMES])(
      'rejects the reserved field name %s',
      (name) => {
        const document = openForm({
          fields: [{ name, label: 'Value', type: 'text' }],
        });

        expect(isShown(document, 'invalid-view')).toBe(true);
      },
    );

    test.each([
      ['an unknown type', [{ name: 'a', label: 'A', type: 'date' }]],
      ['a name with spaces', [{ name: 'a b', label: 'A', type: 'text' }]],
      ['a missing label', [{ name: 'a', label: ' ', type: 'text' }]],
      [
        'a dropdown without values',
        [{ name: 'a', label: 'A', type: 'select' }],
      ],
      [
        'two fields with one name',
        [
          { name: 'a', label: 'A', type: 'text' },
          { name: 'a', label: 'B', type: 'text' },
        ],
      ],
      ['no fields', []],
    ])('rejects %s, as parseFollowUpForm does', (_case, fields) => {
      expect(() => parseFollowUpForm({ fields })).toThrow(
        /Invalid follow-up form/,
      );
      expect(isShown(openForm({ fields }), 'invalid-view')).toBe(true);
    });
  });
});
