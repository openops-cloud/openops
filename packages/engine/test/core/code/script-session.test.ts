import { CodeSandbox, ScriptSession } from '../../../src/lib/core/code/code-sandbox-common';
import { noOpCodeSandbox } from '../../../src/lib/core/code/no-op-code-sandbox';
import { v8IsolateCodeSandbox } from '../../../src/lib/core/code/v8-isolate-code-sandbox';

describe.each<[string, CodeSandbox]>([
  ['no-op', noOpCodeSandbox],
  ['v8 isolate', v8IsolateCodeSandbox],
])('%s script session', (_name, sandbox) => {
  let session: ScriptSession;

  beforeEach(async () => {
    session = await sandbox.createScriptSession();
  });

  afterEach(() => {
    session.dispose();
  });

  test('evaluates a bare expression', async () => {
    expect(await session.run('1 + 2', {})).toBe(3);
  });

  test('exposes the given globals and nothing else', async () => {
    expect(await session.run('a.x + b', { a: { x: 1 }, b: 2 })).toBe(3);
    await expect(session.run('a.x', {})).rejects.toThrow();
  });

  test('does not leak mutations of a global between runs', async () => {
    const arr = [1, 2];
    await session.run('a.push(3)', { a: arr });
    expect(await session.run('a.length', { a: arr })).toBe(2);
    expect(arr).toEqual([1, 2]);
  });

  test('returns a copy, not the host value', async () => {
    const value = { items: [1] };
    const result = (await session.run('a', { a: value })) as typeof value;
    expect(result).toEqual(value);
    expect(result).not.toBe(value);
  });

  test('runs tokens fired concurrently one at a time, in order', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => session.run(`a * ${i}`, { a: 2 })),
    );
    expect(results).toEqual(Array.from({ length: 20 }, (_, i) => 2 * i));
  });

  test('rejects on a runtime error', async () => {
    await expect(session.run('nope.x', {})).rejects.toThrow();
  });

  test('rejects on a syntax error', async () => {
    await expect(session.run('1 +', {})).rejects.toThrow();
  });

  test('rejects after dispose and tolerates a second dispose', async () => {
    session.dispose();
    session.dispose();
    await expect(session.run('1', {})).rejects.toThrow();
  });
});

describe('v8 isolate script session', () => {
  test('does not leak globals between runs', async () => {
    const session = await v8IsolateCodeSandbox.createScriptSession();
    try {
      await session.run('globalThis.k = 1', {});
      expect(await session.run('typeof k', {})).toBe('undefined');
    } finally {
      session.dispose();
    }
  });

  test('provides the base64 polyfill in every context', async () => {
    const session = await v8IsolateCodeSandbox.createScriptSession();
    try {
      expect(await session.run("btoa('hi')", {})).toBe('aGk=');
      expect(await session.run("atob('aGk=')", {})).toBe('hi');
    } finally {
      session.dispose();
    }
  });

  test('globals and the polyfill are applied in the same order as runScript', async () => {
    const session = await v8IsolateCodeSandbox.createScriptSession();
    try {
      // the polyfill only defines btoa when it is not already a function, so a string global is replaced
      const legacy = await v8IsolateCodeSandbox.runScript({ script: 'typeof btoa', scriptContext: { btoa: 'mine' } });
      expect(await session.run('typeof btoa', { btoa: 'mine' })).toBe(legacy);
      expect(legacy).toBe('function');
    } finally {
      session.dispose();
    }
  });

  test('releases per-run references so many large globals do not exhaust the isolate', async () => {
    const session = await v8IsolateCodeSandbox.createScriptSession();
    try {
      const big = { data: 'x'.repeat(4 * 1024 * 1024) };
      for (let i = 0; i < 40; i++) {
        expect(await session.run('a.data.length', { a: big })).toBe(big.data.length);
      }
    } finally {
      session.dispose();
    }
  }, 60_000);

  test('a memory-limit kill in one token does not affect sibling or later tokens', async () => {
    const session = await v8IsolateCodeSandbox.createScriptSession();
    try {
      const [ok1, oom, ok2, ok3] = await Promise.allSettled([
        session.run('a + 1', { a: 1 }),
        session.run("(() => { const x = []; for (;;) x.push(new Array(1e6).fill('m')); })()", {}),
        session.run('a + 2', { a: 1 }),
        session.run("b.join('')", { b: ['x', 'y'] }),
      ]);
      expect(ok1).toEqual({ status: 'fulfilled', value: 2 });
      expect(oom.status).toBe('rejected');
      expect(ok2).toEqual({ status: 'fulfilled', value: 3 });
      expect(ok3).toEqual({ status: 'fulfilled', value: 'xy' });
      expect(await session.run('1 + 1', {})).toBe(2);
    } finally {
      session.dispose();
    }
  }, 60_000);

  test('a non-cloneable result rejects like runScript does', async () => {
    const session = await v8IsolateCodeSandbox.createScriptSession();
    try {
      await expect(session.run('() => 1', {})).rejects.toThrow();
      await expect(v8IsolateCodeSandbox.runScript({ script: '() => 1', scriptContext: {} })).rejects.toThrow();
    } finally {
      session.dispose();
    }
  });
});
