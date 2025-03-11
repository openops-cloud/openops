const applyTemplateUpdateMock = {
  applyTemplateUpdate: jest.fn(),
};

const commonMock = {
  ...jest.requireActual('@openops/common'),
  parseArn: jest.fn(),
  getCredentialsForAccount: jest.fn(),
};

jest.mock('../../src/lib/apply-template-update', () => applyTemplateUpdateMock);
jest.mock('@openops/common', () => commonMock);

import { updateStack } from '../../src/lib/update/update-stack';

describe('Apply CloudFormation template', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create action with correct properties', () => {
    expect(Object.keys(updateStack.props).length).toBe(5);
    expect(updateStack.props).toMatchObject({
      arn: {
        required: true,
        type: 'SHORT_TEXT',
      },
      template: {
        required: true,
        type: 'LONG_TEXT',
      },
      shouldWaitForOperation: {
        required: false,
        type: 'CHECKBOX',
      },
      waitForTimeInSecondsProperty: {
        required: false,
        type: 'DYNAMIC',
      },
      dryRun: {
        type: 'CHECKBOX',
        required: false,
      },
    });
  });

  test('should skip the execution when dry run is active', async () => {
    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      propsValue: {
        dryRun: true,
      },
    };

    const result = await updateStack.run(context);
    expect(result).toEqual('Step execution skipped, dry run flag enabled.');

    expect(applyTemplateUpdateMock.applyTemplateUpdate).not.toHaveBeenCalled();
  });

  test.each([
    [true, 10],
    [false, undefined],
  ])(
    'should call applyTemplateUpdate with the correct params',
    async (
      shouldWaitForOperation: boolean,
      waitForTimeInSeconds: number | undefined,
    ) => {
      applyTemplateUpdateMock.applyTemplateUpdate.mockResolvedValue(
        'mockResult',
      );
      commonMock.parseArn.mockReturnValue({
        region: 'region',
        accountId: 'account id',
      });
      commonMock.getCredentialsForAccount.mockResolvedValue({});

      const context = createContext({
        arn: 'arn',
        template: 'template',
        shouldWaitForOperation: shouldWaitForOperation,
        waitForTimeInSecondsProperty: waitForTimeInSeconds
          ? {
              waitForTimeInSeconds: waitForTimeInSeconds,
            }
          : undefined,
      });

      const result = (await updateStack.run(context)) as any;

      expect(result).toEqual('mockResult');
      expect(commonMock.parseArn).toHaveBeenCalledTimes(1);
      expect(commonMock.getCredentialsForAccount).toHaveBeenCalledTimes(1);
      expect(applyTemplateUpdateMock.applyTemplateUpdate).toHaveBeenCalledTimes(
        1,
      );
      expect(applyTemplateUpdateMock.applyTemplateUpdate).toHaveBeenCalledWith(
        {},
        'region',
        'arn',
        'template',
        waitForTimeInSeconds,
      );
    },
  );

  test('should throw error when request fails', async () => {
    applyTemplateUpdateMock.applyTemplateUpdate.mockRejectedValue(
      new Error('mockError'),
    );
    commonMock.parseArn.mockReturnValue({
      region: 'region',
      accountId: 'account id',
    });
    commonMock.getCredentialsForAccount.mockResolvedValue({});

    const context = createContext({
      arn: 'arn',
      template: 'template',
    });

    await expect(updateStack.run(context)).rejects.toThrow(
      'An error occurred while updating cloudformation stack. Message: ',
    );

    expect(commonMock.parseArn).toHaveBeenCalledTimes(1);
    expect(commonMock.getCredentialsForAccount).toHaveBeenCalledTimes(1);
    expect(applyTemplateUpdateMock.applyTemplateUpdate).toHaveBeenCalledTimes(
      1,
    );
    expect(applyTemplateUpdateMock.applyTemplateUpdate).toHaveBeenCalledWith(
      {},
      'region',
      'arn',
      'template',
      undefined,
    );
  });

  interface ContextParams {
    arn: string;
    template: string;
    shouldWaitForOperation?: boolean;
    waitForTimeInSecondsProperty?: Record<string, number>;
  }

  function createContext(params: ContextParams) {
    return {
      ...jest.requireActual('@openops/blocks-framework'),
      propsValue: {
        arn: params.arn,
        template: params.template,
        shouldWaitForOperation: params?.shouldWaitForOperation ?? false,
        waitForTimeInSecondsProperty:
          params?.waitForTimeInSecondsProperty ?? {},
      },
    };
  }
});
