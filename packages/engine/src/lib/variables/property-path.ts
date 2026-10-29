import { isNil } from '@openops/shared';

/**
 * In-process resolution of pure property-path tokens such as `step_1.body[0]['id']`.
 *
 * Grammar (anything else is not a path and goes to the script sandbox):
 *   path    := ident segment*
 *   segment := '.' ident | '[' int ']' | '[' string ']'
 *   ident   := [A-Za-z_$][A-Za-z0-9_$]*
 *   int     := 0 | [1-9][0-9]*
 *   string  := single- or double-quoted, with the escapes the data selector UI emits
 */

const BLOCKED_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);
const BLOCKED_ROOTS = new Set([
  'undefined',
  'NaN',
  'Infinity',
  'true',
  'false',
  'null',
  'this',
  'globalThis',
]);
const IDENT_START = /[A-Za-z_$]/;
const IDENT_PART = /[A-Za-z0-9_$]/;
const ARRAY_INDEX = /^(0|[1-9]\d*)$/;
const SIMPLE_ESCAPES: Record<string, string> = {
  n: '\n',
  r: '\r',
  t: '\t',
  b: '\b',
  f: '\f',
  v: '\v',
};
/**
 * Scripts that can reach step outputs without naming them literally; they get every step in scope.
 * `constructor` covers `(() => {}).constructor('return tri' + 'gger')()`; `\u` / `\x` cover
 * identifier escapes such as `step_1`.
 */
const DYNAMIC_ACCESS =
  /\b(globalThis|this|eval|Function|arguments|constructor|prototype|__proto__|Reflect|Proxy)\b|\\[ux]/;

export type PropertyPathResolution =
  { status: 'resolved'; value: unknown } | { status: 'bail' };

class PathParser {
  private pos = 0;

  constructor(private readonly input: string) {}

  parse(): string[] | null {
    this.skipWhitespace();
    const root = this.readIdentifier();
    if (isNil(root) || BLOCKED_ROOTS.has(root)) {
      return null;
    }
    const segments = [root];
    for (;;) {
      this.skipWhitespace();
      if (this.pos >= this.input.length) {
        break;
      }
      const segment = this.readSegment();
      if (isNil(segment)) {
        return null;
      }
      segments.push(segment);
    }
    return segments.some((segment) => BLOCKED_SEGMENTS.has(segment))
      ? null
      : segments;
  }

  private readSegment(): string | null {
    const char = this.input[this.pos];
    if (char === '.') {
      this.pos++;
      this.skipWhitespace();
      return this.readIdentifier();
    }
    if (char !== '[') {
      return null;
    }
    this.pos++;
    this.skipWhitespace();
    const key =
      this.input[this.pos] === "'" || this.input[this.pos] === '"'
        ? this.readString()
        : this.readIndex();
    if (isNil(key)) {
      return null;
    }
    this.skipWhitespace();
    if (this.input[this.pos] !== ']') {
      return null;
    }
    this.pos++;
    return key;
  }

  private readIdentifier(): string | null {
    const start = this.pos;
    if (!IDENT_START.test(this.input[this.pos] ?? '')) {
      return null;
    }
    while (
      this.pos < this.input.length &&
      IDENT_PART.test(this.input[this.pos])
    ) {
      this.pos++;
    }
    return this.input.slice(start, this.pos);
  }

  private readIndex(): string | null {
    const start = this.pos;
    while (this.pos < this.input.length && /\d/.test(this.input[this.pos])) {
      this.pos++;
    }
    const digits = this.input.slice(start, this.pos);
    if (!ARRAY_INDEX.test(digits)) {
      return null;
    }
    // a numeric literal becomes a property key through Number → String, which rounds past 2^53
    // exactly as `obj[9007199254740993]` does in JavaScript
    return String(Number(digits));
  }

  private readString(): string | null {
    const quote = this.input[this.pos++];
    let value = '';
    while (this.pos < this.input.length) {
      const char = this.input[this.pos++];
      if (char === quote) {
        return value;
      }
      if (char === '\n' || char === '\r') {
        return null;
      }
      if (char !== '\\') {
        value += char;
        continue;
      }
      const escaped = this.readEscape();
      if (isNil(escaped)) {
        return null;
      }
      value += escaped;
    }
    return null;
  }

  /** Mirrors JS string-literal escape semantics for what the UI emits; anything exotic is not a path. */
  private readEscape(): string | null {
    const next = this.input[this.pos++];
    if (isNil(next)) {
      return null;
    }
    if (next === '\r') {
      if (this.input[this.pos] === '\n') {
        this.pos++;
      }
      return '';
    }
    if (next === '\n' || next === ' ' || next === ' ') {
      return '';
    }
    if (next in SIMPLE_ESCAPES) {
      return SIMPLE_ESCAPES[next];
    }
    if (next === '0' && !/\d/.test(this.input[this.pos] ?? '')) {
      return '\0';
    }
    if (/[\dux]/.test(next)) {
      return null;
    }
    return next;
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /[ \t]/.test(this.input[this.pos])) {
      this.pos++;
    }
  }
}

/** Returns the path segments when `expression` is a pure member-access chain, otherwise null. */
export function parsePropertyPath(expression: string): string[] | null {
  return new PathParser(expression).parse();
}

/** `JSON.parse(JSON.stringify(value))`; undefined when JSON cannot represent the value. */
export function cloneJson<T = unknown>(value: T): T | undefined {
  const serialized = JSON.stringify(value);
  return serialized === undefined ? undefined : JSON.parse(serialized);
}

const hasOwn = (target: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(target, key);

/** Objects that JSON.stringify reproduces structurally: plain objects without toJSON, and arrays. */
function isJsonPlain(value: object): boolean {
  if ('toJSON' in value) {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

type Step = { next: unknown } | { bail: true };
const BAIL: Step = { bail: true };

/** One segment into an array: JSON turns holes, undefined, functions and symbols into null and drops named props. */
function stepIntoArray(current: unknown[], segment: string): Step {
  if (ARRAY_INDEX.test(segment)) {
    const index = Number(segment);
    if (index >= current.length) {
      return { next: undefined };
    }
    const element = current[index];
    const isHole = !Object.prototype.hasOwnProperty.call(current, segment);
    const droppedByJson =
      element === undefined ||
      typeof element === 'function' ||
      typeof element === 'symbol';
    return { next: isHole || droppedByJson ? null : element };
  }
  if (segment !== 'length' && hasOwn(current, segment)) {
    return BAIL;
  }
  return { next: Reflect.get(current, segment) };
}

/** One segment into a plain object: own enumerable data properties only, as JSON would have kept them. */
function stepIntoPlainObject(current: object, segment: string): Step {
  if (!hasOwn(current, segment)) {
    return { next: Reflect.get(current, segment) };
  }
  const descriptor = Object.getOwnPropertyDescriptor(current, segment);
  // JSON skips non-enumerable properties and evaluates accessors; let the sandbox decide both
  if (!descriptor?.enumerable || descriptor.get !== undefined) {
    return BAIL;
  }
  const value = descriptor.value;
  // own functions / symbols are dropped by JSON
  const droppedByJson =
    typeof value === 'function' || typeof value === 'symbol';
  return { next: droppedByJson ? undefined : value };
}

function stepInto(current: unknown, segment: string): Step {
  if (typeof current === 'number' && !Number.isFinite(current)) {
    // NaN / Infinity serialize to null, and null has no properties
    return { next: undefined };
  }
  if (typeof current === 'bigint') {
    return BAIL;
  }
  if (typeof current === 'object' && current !== null) {
    if (!isJsonPlain(current)) {
      return BAIL;
    }
    return Array.isArray(current)
      ? stepIntoArray(current, segment)
      : stepIntoPlainObject(current, segment);
  }
  // primitives: 'abc'.length, 'abc'[0]; inherited properties of anything else
  return { next: Reflect.get(Object(current), segment) };
}

/**
 * Walks `segments` over the live `root` and returns a JSON clone of the result, producing exactly what
 * evaluating the same path inside the sandbox over a JSON-cloned state would. Bails whenever an
 * intermediate value is something JSON would not have reproduced faithfully (Date, Buffer, class
 * instances, named array properties, non-enumerable properties), so the sandbox decides.
 */
export function resolvePropertyPath(
  root: unknown,
  segments: string[],
): PropertyPathResolution {
  let current: unknown = root;
  for (const segment of segments) {
    if (isNil(current)) {
      return { status: 'resolved', value: undefined };
    }
    const step = stepInto(current, segment);
    if ('bail' in step) {
      return { status: 'bail' };
    }
    current = step.next;
  }
  return { status: 'resolved', value: cloneJson(current) };
}

/** Step names a script may read: substring matches, or all of them when it can reach globals dynamically. */
export function extractReferencedStepNames(
  script: string,
  stepNames: readonly string[],
): string[] {
  if (DYNAMIC_ACCESS.test(script)) {
    return [...stepNames];
  }
  return stepNames.filter((stepName) => script.includes(stepName));
}
