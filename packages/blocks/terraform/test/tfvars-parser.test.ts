jest.mock('@openops/server-shared');

const mockUseTempFile = jest.fn();
const mockHclParse = jest.fn();

jest.mock('@openops/common', () => ({
  ...jest.requireActual('@openops/common'),
  useTempFile: (...args: any[]) => mockUseTempFile(...args),
}));

jest.mock('@cdktf/hcl2json', () => ({
  parse: (...args: any[]) => mockHclParse(...args),
}));

jest.mock('../src/lib/hcledit-cli', () => ({
  listBlocksCommand: jest.fn(),
}));

import { listBlocksCommand } from '../src/lib/hcledit-cli';
import { getVariables, parseFileContent } from '../src/lib/tfvars-parser';

describe('Parse file content', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns JSON when input is a valid JSON object', async () => {
    const input = JSON.stringify({ a: 1, b: 'x' });

    const res = await parseFileContent(input);

    expect(res.success).toBe(true);
    expect(res.content).toMatchObject({ a: 1, b: 'x' });
    expect(listBlocksCommand).not.toHaveBeenCalled();
    expect(mockUseTempFile).not.toHaveBeenCalled();
  });

  test('fails when validation marks file invalid (hcledit outputs content)', async () => {
    (listBlocksCommand as jest.Mock).mockResolvedValue({
      stdOut: 'block something',
      stdError: '',
      exitCode: 0,
    });

    const res = await parseFileContent('not json and invalid');

    expect(res.success).toBe(false);
    expect(res.message).toBe(
      'The provided file is not a valid Terraform variables file (.tfvars).',
    );
    expect(res.content).toMatchObject({});
  });

  test('parses HCL when validation passes (no output) and not JSON', async () => {
    (listBlocksCommand as jest.Mock).mockResolvedValue({
      stdOut: '   \n  ',
      stdError: '',
      exitCode: 0,
    });

    mockUseTempFile.mockImplementation(async (_content: string, cb: any) => {
      return await cb('/tmp/file.tfvars');
    });

    mockHclParse.mockResolvedValue({ x: 2, y: 'z' });

    const res = await parseFileContent('name = "value"');

    expect(res.success).toBe(true);
    expect(res.content).toMatchObject({ x: 2, y: 'z' });
    expect(mockHclParse).toHaveBeenCalledWith(
      '/tmp/file.tfvars',
      'name = "value"',
    );
  });

  test('returns failure when HCL parse throws', async () => {
    (listBlocksCommand as jest.Mock).mockResolvedValue({
      stdOut: '',
      stdError: '',
      exitCode: 0,
    });

    mockUseTempFile.mockImplementation(async (_content: string, _cb: any) => {
      throw new Error('fs error');
    });

    const res = await parseFileContent('a = 1');

    expect(res.success).toBe(false);
    expect(res.message).toBe(
      'The provided file is not a valid Terraform variables file (.tfvars).',
    );
    expect(res.content).toMatchObject({});
  });
});

describe('Get variables', () => {
  test('infers variable types', async () => {
    const res = await getVariables({
      a: 's',
      b: 1,
      c: true,
      d: [1, 2],
      e: { k: 'v' },
      f: null,
      g: undefined,
    });

    expect(res['a']).toMatchObject({ name: 'a', value: 's', type: 'string' });
    expect(res['b']).toMatchObject({ name: 'b', value: 1, type: 'number' });
    expect(res['c']).toMatchObject({ name: 'c', value: true, type: 'boolean' });
    expect(res['d']).toMatchObject({ name: 'd', value: [1, 2], type: 'array' });
    expect(res['e']).toMatchObject({
      name: 'e',
      value: { k: 'v' },
      type: 'object',
    });
    expect(res['f']).toMatchObject({ name: 'f', value: null, type: 'string' });
    expect(res['g']).toMatchObject({
      name: 'g',
      value: undefined,
      type: 'string',
    });
  });
});
