const deleteVolumeMock = jest.fn();
const getAwsClientMock = {
  getAwsClient: jest.fn().mockImplementation(() => ({
    deleteVolume: deleteVolumeMock,
  })),
};

jest.mock('../../../src/lib/aws/get-client', () => getAwsClientMock);

jest.useFakeTimers();

import { deleteEbsVolume } from '../../../src/lib/aws/ebs/delete-ebs-volume';

const credentials = {
  accessKeyId: 'some accessKeyId',
  secretAccessKey: 'some secretAccessKey',
  defaultRegion: 'some defaultRegion',
};

describe('delete ebs volume tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should delete the given volume', async () => {
    deleteVolumeMock.mockImplementation(() => Promise.resolve({}));

    const result = await deleteEbsVolume(
      credentials,
      'region1',
      'volume1',
      false,
    );
    expect(result).toEqual({});

    expect(getAwsClientMock.getAwsClient).toHaveBeenCalledTimes(1);
    expect(deleteVolumeMock).toHaveBeenCalledWith(
      expect.objectContaining({ DryRun: false, VolumeId: 'volume1' }),
    );
  });

  test.each([true, false])(
    'should run with dry run true if its true',
    async (dryRun: boolean) => {
      deleteVolumeMock.mockImplementation(() => Promise.resolve(null));

      await deleteEbsVolume(credentials, 'region1', 'volume1', dryRun);

      expect(deleteVolumeMock).toHaveBeenCalledWith(
        expect.objectContaining({ DryRun: dryRun, VolumeId: 'volume1' }),
      );
    },
  );
});
