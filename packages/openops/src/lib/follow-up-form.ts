import { Property } from '@openops/blocks-framework';

export const FOLLOW_UP_FIELD_TYPES = [
  'text',
  'email',
  'number',
  'select',
  'textarea',
] as const;

export type FollowUpFieldType = (typeof FOLLOW_UP_FIELD_TYPES)[number];

export type FollowUpFormField = {
  name: string;
  label: string;
  type: FollowUpFieldType;
  required: boolean;
  options?: string[];
  hint?: string;
};

// A form shown on the collect-input page when a message button is clicked.
// Each answer comes back to the flow as parameters.<field name>.
export type FollowUpForm = {
  title?: string;
  subtitle?: string;
  fields: FollowUpFormField[];
  skipLabel?: string;
};

// The resume link already carries these params for routing; an answer with
// the same name would overwrite them.
export const RESERVED_FOLLOW_UP_FIELD_NAMES = new Set([
  'button',
  'path',
  'executionCorrelationId',
  'isTest',
  'actionClicked',
  'actionType',
  'userName',
  '__proto__',
  'constructor',
  'prototype',
]);

type RawField = Partial<Record<keyof FollowUpFormField, unknown>>;
type RawForm = Partial<Record<keyof FollowUpForm, unknown>>;

const FIELD_NAME_REGEX = /^[A-Za-z]\w{0,39}$/;
const MAX_FIELDS = 10;

function fail(reason: string): never {
  throw new Error(`Invalid follow-up form: ${reason}`);
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseOptions(name: string, value: unknown): string[] {
  // Numbers are accepted and shown as text; an answer always comes back to
  // the flow as text anyway.
  const options = Array.isArray(value)
    ? value
        .filter((v) => typeof v === 'string' || typeof v === 'number')
        .map((v) => String(v).trim())
    : [];
  const unique = [...new Set(options.filter(Boolean))];
  if (!unique.length) {
    fail(`dropdown field "${name}" has no values`);
  }
  return unique;
}

function parseField(value: unknown, index: number): FollowUpFormField {
  const raw = (value ?? {}) as RawField;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!FIELD_NAME_REGEX.test(name)) {
    fail(
      `field ${index + 1} needs a name of letters, digits and underscores, starting with a letter`,
    );
  }
  if (RESERVED_FOLLOW_UP_FIELD_NAMES.has(name)) {
    fail(`field name "${name}" is reserved`);
  }

  const label = optionalText(raw.label);
  if (!label) {
    fail(`field "${name}" has no label`);
  }

  const type = raw.type as FollowUpFieldType;
  if (!FOLLOW_UP_FIELD_TYPES.includes(type)) {
    fail(`field "${name}" has an unknown type "${String(raw.type)}"`);
  }

  const field: FollowUpFormField = {
    name,
    label,
    type,
    required: raw.required !== false,
  };
  if (type === 'select') {
    field.options = parseOptions(name, raw.options);
  }
  const hint = optionalText(raw.hint);
  if (hint) {
    field.hint = hint;
  }
  return field;
}

export function parseFollowUpForm(value: unknown): FollowUpForm {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('expected an object with a list of fields');
  }
  const raw = value as RawForm;
  if (!Array.isArray(raw.fields) || !raw.fields.length) {
    fail('it needs at least one field');
  }
  if (raw.fields.length > MAX_FIELDS) {
    fail(`it can have at most ${MAX_FIELDS} fields`);
  }

  const fields = raw.fields.map((field, index) => parseField(field, index));
  const names = fields.map((field) => field.name);
  const duplicate = names.find((name, i) => names.indexOf(name) !== i);
  if (duplicate) {
    fail(`two fields are named "${duplicate}"`);
  }

  const form: FollowUpForm = { fields };
  const title = optionalText(raw.title);
  const subtitle = optionalText(raw.subtitle);
  const skipLabel = optionalText(raw.skipLabel);
  if (title) {
    form.title = title;
  }
  if (subtitle) {
    form.subtitle = subtitle;
  }
  if (skipLabel) {
    form.skipLabel = skipLabel;
  }
  return form;
}

// base64url keeps the link shorter than percent-encoded JSON, which matters
// because Slack rejects a message whose button URL exceeds 3,000 characters.
export function encodeFollowUpForm(form: FollowUpForm): string {
  return Buffer.from(JSON.stringify(form), 'utf8').toString('base64url');
}

// What a message button can carry about its form. The last three are the
// settings buttons had before forms existed.
export type ButtonFormSettings = {
  followUpForm?: unknown;
  followUpQuestion?: string;
  answerFormat?: string;
  noAnswerOption?: string;
};

const LEGACY_ANSWER_FORMATS = ['text', 'email', 'number'] as const;

// Flows built before forms existed still send a single follow-up question,
// among them flows whose buttons are produced at run time by an earlier
// step. It becomes a one-field form whose answer keeps the name those flows
// read: parameters.answer.
// TODO: remove once no running flow sends followUpQuestion.
function legacyQuestionForm(
  button: ButtonFormSettings,
  header?: string,
): unknown {
  const question = optionalText(button.followUpQuestion);
  if (!question) {
    return undefined;
  }
  const type = LEGACY_ANSWER_FORMATS.find(
    (format) => format === button.answerFormat,
  );
  return {
    // The single-question page has always shown the message header.
    title: header,
    fields: [{ name: 'answer', label: question, type: type ?? 'text' }],
    skipLabel: button.noAnswerOption,
  };
}

function isEmptySetting(value: unknown): boolean {
  const isEmptyObject =
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === 0;
  return value === undefined || value === null || value === '' || isEmptyObject;
}

// Reads a message button's form. A button without one returns undefined.
// The message header is only used for buttons from flows built before forms
// existed.
export function resolveButtonForm(
  button: ButtonFormSettings,
  header?: string,
): FollowUpForm | undefined {
  const value = isEmptySetting(button.followUpForm)
    ? legacyQuestionForm(button, header)
    : button.followUpForm;
  if (isEmptySetting(value)) {
    return undefined;
  }

  return parseFollowUpForm(value);
}

// The message-button setting in the Slack and Teams "Request Action" steps.
export const followUpFormProperty = Property.Json({
  displayName: 'Follow-up form',
  description:
    'Optionally open a form when this button is clicked. Each answer is returned as parameters.<field name>.',
  required: false,
});
