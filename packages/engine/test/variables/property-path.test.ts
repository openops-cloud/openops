import {
  cloneJson,
  extractReferencedStepNames,
  parsePropertyPath,
  resolvePropertyPath,
} from '../../src/lib/variables/property-path';

describe('parsePropertyPath', () => {
  test.each([
    ['trigger', ['trigger']],
    [' trigger.name ', ['trigger', 'name']],
    ['step_1.body[0].id', ['step_1', 'body', '0', 'id']],
    ["step_1['a b']", ['step_1', 'a b']],
    ['step_1["a b"]', ['step_1', 'a b']],
    ["step_1[ 'a' ]", ['step_1', 'a']],
    ["step_1 ['a']", ['step_1', 'a']],
    ["trigger.items['0']", ['trigger', 'items', '0']],
    ['$x._y.z$', ['$x', '_y', 'z$']],
    ['step_1 . name', ['step_1', 'name']],
    // escapes as emitted by the data selector UI
    ["step_1['it\\'s']", ['step_1', "it's"]],
    ["step_1['a\\\\b']", ['step_1', 'a\\b']],
    ["step_1['a\\\"b']", ['step_1', 'a"b']],
    ["step_1['a\\’b']", ['step_1', 'a’b']],
    ["step_1['a\\\nb']", ['step_1', 'ab']],
    ["step_1['a\\\r\nb']", ['step_1', 'ab']],
    ["step_1['a\\\tb']", ['step_1', 'a\tb']],
    ["step_1['a\\nb']", ['step_1', 'a\nb']],
    ["step_1['a\\tb']", ['step_1', 'a\tb']],
    ["step_1['a\\0b']", ['step_1', 'a\0b']],
      ['step_1[9007199254740993]', ['step_1', '9007199254740992']],
    ['step_1[123456789012345678901234]', ['step_1', String(Number('123456789012345678901234'))]],
  ])('parses %p', (input, expected) => {
    expect(parsePropertyPath(input)).toEqual(expected);
  });

  test.each([
    '',
    '   ',
    'trigger.',
    '.name',
    'trigger..name',
    'trigger[0',
    "trigger['a]",
    'trigger[]',
    'trigger.name + 1',
    'trigger.name()',
    'trigger?.name',
    'trigger.name;',
    '[4,5,6]',
    '1+2',
    'Math.min(a,b)',
    'trigger[01]',
    'trigger[-1]',
    'trigger[1.5]',
    'trigger[0x1]',
    'trigger[1_0]',
    "trigger['\\x41']",
    "trigger['\\u0041']",
    "trigger['\\1']",
    'trigger.__proto__',
    'trigger.constructor.name',
    'trigger["prototype"]',
    "trigger['__proto__']",
    'tríger',
    '1abc',
    'a.1abc',
    'trigger[a]',
    "trigger['a' + 'b']",
    'trigger.name\n',
    'trigger[`a`]',
  ])('rejects %p', (input) => {
    expect(parsePropertyPath(input)).toBeNull();
  });

  test('parses a 10k-segment path quickly', () => {
    const input = 'a' + '.b'.repeat(10_000);
    const start = performance.now();
    const segments = parsePropertyPath(input);
    expect(performance.now() - start).toBeLessThan(50);
    expect(segments).toHaveLength(10_001);
  });
});

describe('resolvePropertyPath', () => {
  const root = {
    name: 'John',
    items: [5, 'a', { deep: { x: 'y' } }],
    nul: null,
    date: new Date('2024-01-02T03:04:05Z'),
    buf: Buffer.from('hi'),
    withToJson: { toJSON: () => 'custom' },
    und: undefined,
    nan: NaN,
    neg0: -0,
    'it\'s': 1,
    holes: [1, , 3], // eslint-disable-line no-sparse-arrays
  };
  const arrWithProp = Object.assign([1, 2], { foo: 'bar' });
  const nonEnum = Object.defineProperty({ a: 1 }, 'hidden', { value: 2, enumerable: false });

  test.each([
    [[], root, { ...JSON.parse(JSON.stringify(root)) }],
    [['name'], root, 'John'],
    [['items', '1'], root, 'a'],
    [['items', '2', 'deep', 'x'], root, 'y'],
    [['items', 'length'], root, 3],
    [['name', 'length'], root, 4],
    [['name', '0'], root, 'J'],
    [["it's"], root, 1],
    [['date'], root, '2024-01-02T03:04:05.000Z'],
    [['nan'], root, null],
    [['neg0'], root, 0],
    [['holes'], root, [1, null, 3]],
    [['withToJson'], root, 'custom'],
    [['buf'], root, { type: 'Buffer', data: [104, 105] }],
  ])('resolves %p', (segments, scope, expected) => {
    expect(resolvePropertyPath(scope, segments)).toEqual({ status: 'resolved', value: expected });
  });

  test.each([
    [['items', 'map'], root],
    [['name', 'toUpperCase'], root],
    [['nul', 'x'], root],
    [['missing'], root],
    [['missing', 'deep'], root],
    [['und'], root],
    [['und', 'x'], root],
    [['a'], null],
    [['a'], undefined],
    [[], undefined],
  ])('resolves %p on %p to undefined', (segments, scope) => {
    expect(resolvePropertyPath(scope, segments)).toEqual({ status: 'resolved', value: undefined });
  });

  test.each([
    [['date', 'length'], root],
    [['buf', 'data'], root],
    [['withToJson', 'length'], root],
    [['foo'], arrWithProp],
    [['hidden'], nonEnum],
    [['items', 'foo'], { items: arrWithProp }],
    [['length'], Object.assign(class extends Array { toJSON() { return 'x'; } }.from([1]), {})],
  ])('bails on %p (intermediate not JSON-plain)', (segments, scope) => {
    expect(resolvePropertyPath(scope, segments)).toEqual({ status: 'bail' });
  });

  test('functions, symbols and undefined inside arrays read as null, as after JSON', () => {
    const scope = { odd: [Symbol('x'), function named() { return 1; }, undefined, 'last'] };
    expect(resolvePropertyPath(scope, ['odd', '0'])).toEqual({ status: 'resolved', value: null });
    expect(resolvePropertyPath(scope, ['odd', '0', 'description'])).toEqual({ status: 'resolved', value: undefined });
    expect(resolvePropertyPath(scope, ['odd', '1', 'name'])).toEqual({ status: 'resolved', value: undefined });
    expect(resolvePropertyPath(scope, ['odd', '2'])).toEqual({ status: 'resolved', value: null });
    expect(resolvePropertyPath(scope, ['odd', '3'])).toEqual({ status: 'resolved', value: 'last' });
  });

  test('never returns a live reference', () => {
    const result = resolvePropertyPath(root, ['items']);
    expect(result).toEqual({ status: 'resolved', value: [5, 'a', { deep: { x: 'y' } }] });
    expect((result as { value: unknown }).value).not.toBe(root.items);
  });

  test('drops undefined fields like JSON.stringify', () => {
    expect(resolvePropertyPath({ a: { b: undefined, c: 1 } }, ['a'])).toEqual({
      status: 'resolved',
      value: { c: 1 },
    });
  });
});

describe('cloneJson', () => {
  test('returns undefined for values JSON cannot represent', () => {
    expect(cloneJson(() => 1)).toBeUndefined();
    expect(cloneJson(Symbol('s'))).toBeUndefined();
    expect(cloneJson(undefined)).toBeUndefined();
  });

  test('normalizes like a JSON round trip', () => {
    expect(cloneJson({ d: new Date(0), u: undefined, n: NaN })).toEqual({ d: '1970-01-01T00:00:00.000Z', n: null });
    expect(cloneJson('memory://x')).toBe('memory://x');
    expect(cloneJson(null)).toBeNull();
    expect(cloneJson(false)).toBe(false);
  });

  test('throws on circular input', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    expect(() => cloneJson(circular)).toThrow();
  });
});

describe('extractReferencedStepNames', () => {
  const stepNames = ['trigger', 'step_1', 'step_10', 'loop'];

  test('returns steps whose name appears in the script', () => {
    expect(extractReferencedStepNames('step_1.x + trigger.y', stepNames)).toEqual(['trigger', 'step_1']);
  });

  test('prefix match over-includes (step_1 inside step_10)', () => {
    expect(extractReferencedStepNames('step_10.x', stepNames)).toEqual(['step_1', 'step_10']);
  });

  test('returns nothing for scripts without step references', () => {
    expect(extractReferencedStepNames('1 + 2', stepNames)).toEqual([]);
    expect(extractReferencedStepNames('Math.PI', stepNames)).toEqual([]);
  });

  test.each([
    'globalThis.step_1',
    'this.step_1',
    'eval("step_1")',
    'Function("return step_1")()',
    'arguments[0]',
    'st\\u0065p_1',
    '\\x73tep_1',
      "(() => {}).constructor('return x')()",
    'Reflect.get(globalThis, "x")',
    '[].map.__proto__',
  ])('returns all steps for dynamic access %p', (script) => {
    expect(extractReferencedStepNames(script, stepNames)).toEqual(stepNames);
  });
});
