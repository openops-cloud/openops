const common = {
  ...jest.requireActual('@openops/common'),
  addTagsToResources: jest.fn(),
  getCredentialsForAccount: jest.fn(),
};

jest.mock('@openops/common', () => common);

import { addTagsAction } from '../src/lib/actions/add-tags-action';

describe('applyRemediationAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const auth = {
    accessKeyId: 'some accessKeyId',
    secretAccessKey: 'some secretAccessKey',
  };

  test('should create action with correct properties', () => {
    expect(addTagsAction.props).toMatchObject({
      resourceARNs: {
        type: 'ARRAY',
        required: true,
      },
      tags: {
        type: 'OBJECT',
        required: true,
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

    const result = await addTagsAction.run(context);
    expect(result).toEqual('Step execution skipped, dry run flag enabled.');

    expect(common.addTagsToResources).not.toHaveBeenCalled();
  });

  test.each([
    { resourceARNs: '', tags: undefined },
    { resourceARNs: undefined, tags: undefined },
    { resourceARNs: undefined, tags: { test: 'test' } },
    { resourceARNs: 'arn', tags: {} },
    { resourceARNs: 'arn', tags: undefined },
  ])(
    'should throw if resourceARNs or tags are undefined',
    async (input: any) => {
      const context = {
        ...jest.requireActual('@openops/blocks-framework'),
        auth: auth,
        propsValue: {
          resourceARNs: input.resourceARNs,
          tags: input.tags,
        },
      };

      await expect(addTagsAction.run(context)).rejects.toThrow(
        'An error occurred while adding tags to the resources:',
      );
    },
  );

  test('should call the addTagsToResources function to add the tags', async () => {
    common.getCredentialsForAccount.mockResolvedValue('credentials');
    const expectedResult = { succeeded: [], failed: {} };
    const resourceARN = 'arn:aws:iam::1:service/resource1';
    const tags = { test: 'test' };

    common.addTagsToResources.mockResolvedValue(expectedResult);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        resourceARNs: resourceARN,
        tags,
      },
    };

    const result = await addTagsAction.run(context);
    expect(result).toEqual([expectedResult]);
    expect(common.addTagsToResources).toHaveBeenCalledWith(
      [resourceARN],
      tags,
      'credentials',
    );
  });

  test('should go over all accounts', async () => {
    common.getCredentialsForAccount
      .mockResolvedValueOnce('credentials1')
      .mockResolvedValueOnce('credentials2')
      .mockResolvedValueOnce('credentials3');

    const expectedResult = { succeeded: [], failed: {} };
    const tags = { test: 'test' };

    common.addTagsToResources.mockResolvedValue(expectedResult);

    const context = {
      ...jest.requireActual('@openops/blocks-framework'),
      auth: auth,
      propsValue: {
        resourceARNs: [
          'arn:aws:iam::1:service/resource1',
          'arn:aws:iam::2:service/resource2',
          'arn:aws:iam::3:service/resource3',
          'arn:aws:iam::1:service/resource4',
          'arn:aws:iam::3:service/resource5',
        ],
        tags,
      },
    };

    const result = await addTagsAction.run(context);
    expect(result).toEqual([
      { succeeded: [], failed: {} },
      { succeeded: [], failed: {} },
      { succeeded: [], failed: {} },
    ]);
    expect(common.addTagsToResources).toHaveBeenCalledTimes(3);
    expect(common.addTagsToResources).toHaveBeenNthCalledWith(
      1,
      ['arn:aws:iam::1:service/resource1', 'arn:aws:iam::1:service/resource4'],
      tags,
      'credentials1',
    );
    expect(common.addTagsToResources).toHaveBeenNthCalledWith(
      2,
      ['arn:aws:iam::2:service/resource2'],
      tags,
      'credentials2',
    );
    expect(common.addTagsToResources).toHaveBeenNthCalledWith(
      3,
      ['arn:aws:iam::3:service/resource3', 'arn:aws:iam::3:service/resource5'],
      tags,
      'credentials3',
    );
  });
});
