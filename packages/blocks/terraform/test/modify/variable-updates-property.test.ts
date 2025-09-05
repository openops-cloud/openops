const parserMock = {
  getVariables: jest.fn(),
  parseFileContent: jest.fn(),
};

jest.mock('../../src/lib/tfvars-parser', () => parserMock);

import { DynamicPropsValue } from '@openops/blocks-framework';
import { getVariableUpdatesProperty } from '../../src/lib/modify/variable-updates-property';

describe('Variable Updates Dynamic Properties', () => {
  const context = {
    ...jest.requireActual('@openops/blocks-framework'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return empty when no file provided', async () => {
    const prop = getVariableUpdatesProperty();
    const result = await prop.props({}, context);

    expect(prop.type).toBe('DYNAMIC');
    expect(result).toMatchObject({});
  });

  test('should return markdown on parse error with message', async () => {
    parserMock.parseFileContent.mockResolvedValue({
      success: false,
      message: 'err',
    });
    const prop = getVariableUpdatesProperty();

    const result = await prop.props(
      { fileContent: 'bad' } as DynamicPropsValue,
      context,
    );

    expect(parserMock.parseFileContent).toHaveBeenCalledWith('bad');
    expect(result).toMatchObject(
      expect.objectContaining({
        updates: {
          displayName: 'Intended modifications',
          options: {
            options: [],
            error: 'err',
            disabled: true,
            placeholder: 'No options available.',
          },
          required: true,
          type: 'STATIC_DROPDOWN',
          valueSchema: undefined,
        },
      }),
    );
  });

  test('should build updates array with variable options from parsed file', async () => {
    parserMock.parseFileContent.mockResolvedValue({
      success: true,
      content: 'ok',
    });
    parserMock.getVariables.mockResolvedValue({
      var1: { name: 'var1', type: 'string', value: 'a' },
      var2: { name: 'var2', type: 'boolean', value: true },
    });

    const prop = getVariableUpdatesProperty();
    const result = (await prop.props(
      { fileContent: 'content' } as DynamicPropsValue,
      context,
    )) as DynamicPropsValue;

    expect(parserMock.parseFileContent).toHaveBeenCalledWith('content');
    expect(parserMock.getVariables).toHaveBeenCalledWith('ok');

    expect(result['updates'].type).toBe('ARRAY');

    const updatesProps = result['updates'].properties;
    expect(updatesProps.variableName.type).toBe('STATIC_DROPDOWN');
    const options = updatesProps.variableName.options.options;
    expect(options).toEqual([
      { label: 'var1', value: 'var1' },
      { label: 'var2', value: 'var2' },
    ]);

    expect(updatesProps.variableValue.type).toBe('DYNAMIC');

    const dyn = updatesProps.variableValue;
    const forVar1 = await dyn.props({ variableName: 'var1' });
    expect(forVar1.variableValue.type).toBe('LONG_TEXT');
    expect(forVar1.variableValue.defaultValue).toBe('a');

    const forVar2 = await dyn.props({ variableName: 'var2' });
    expect(forVar2.variableValue.type).toBe('STATIC_DROPDOWN');
    expect(forVar2.variableValue.defaultValue).toBe('true');
  });

  test('should return empty dynamic when no variableName provided', async () => {
    const prop = getVariableUpdatesProperty();
    await ((result) => result)(
      (await prop.props(
        { fileContent: '' } as DynamicPropsValue,
        context,
      )) as any,
    );

    parserMock.parseFileContent.mockResolvedValue({
      success: true,
      content: 'ok',
    });
    parserMock.getVariables.mockResolvedValue({
      var1: { name: 'var1', type: 'string' },
    });

    const prop2 = getVariableUpdatesProperty();
    const res2 = (await prop2.props(
      { fileContent: 'x' } as DynamicPropsValue,
      context,
    )) as DynamicPropsValue;

    const empty = await res2['updates'].properties.variableValue.props(
      {},
      context,
    );
    expect(empty).toEqual({ variableValue: {} });
  });
});
