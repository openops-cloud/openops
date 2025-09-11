jest.mock('../../src/lib/hcledit-cli', () => ({
  updateVariablesFile: jest.fn(),
}));
jest.mock('../../src/lib/tfvars-parser', () => ({
  tryParseFileAsJson: jest.fn(),
}));

import * as hcledit from '../../src/lib/hcledit-cli';
import { modifyVariablesFile } from '../../src/lib/modify/modify-variables-file';
import * as parser from '../../src/lib/tfvars-parser';

describe('modifyVariablesFile action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const buildProps = (fileContent: string, updates: any[]) => ({
    fileContent,
    updates: { updates },
  });

  test('applies updates for JSON tfvars and sanitizes values', async () => {
    (parser.tryParseFileAsJson as jest.Mock).mockReturnValue({ a: 1, b: 'x' });

    const props = buildProps('{"a":1,"b":"x"}', [
      { variableName: 'a', variableValue: { variableValue: '2' } },
      { variableName: 'b', variableValue: { variableValue: 'true' } },
      { variableName: 'c', variableValue: { variableValue: ' 3 ' } },
      { variableName: 'd', variableValue: { variableValue: ' hi ' } },
      { variableName: 'e', variableValue: { variableValue: '' } },
      { variableName: 'f', variableValue: { variableValue: 'false' } },
    ]);

    const result = (await modifyVariablesFile.run({
      propsValue: props,
    } as any)) as string;

    expect(hcledit.updateVariablesFile).not.toHaveBeenCalled();

    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ a: 2, b: true, c: 3, d: ' hi ', e: '', f: false });
  });

  test('delegates to hcledit for non-JSON tfvars and maps modifications', async () => {
    (parser.tryParseFileAsJson as jest.Mock).mockReturnValue(null);
    (hcledit.updateVariablesFile as jest.Mock).mockResolvedValue('updated');

    const updates = [
      { variableName: 'v1', variableValue: { variableValue: '42' } },
      { variableName: 'v2', variableValue: { variableValue: 'foo' } },
    ];
    const props = buildProps('a = 1', updates);

    const result = await modifyVariablesFile.run({ propsValue: props } as any);

    expect(hcledit.updateVariablesFile).toHaveBeenCalledWith('a = 1', [
      { variableName: 'v1', variableValue: '42' },
      { variableName: 'v2', variableValue: 'foo' },
    ]);
    expect(result).toBe('updated');
  });
});
