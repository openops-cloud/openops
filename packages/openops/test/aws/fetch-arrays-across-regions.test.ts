const debugMock = jest.fn();

jest.mock('@openops/server-shared', () => {
  return {
    logger: {
      debug: debugMock,
    },
  };
});

import { fetchArraysAcrossRegions } from '../../src/lib/aws/fetch-arrays-across-regions';

describe('fetchArraysAcrossRegions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('merges results from all successful regions', async () => {
    const result = await fetchArraysAcrossRegions(
      ['r1', 'r2'],
      async (region) => [{ region }],
    );

    expect(result).toEqual([{ region: 'r1' }, { region: 'r2' }]);
    expect(debugMock).not.toHaveBeenCalled();
  });

  test('skips permission errors and debugs', async () => {
    const result = await fetchArraysAcrossRegions(
      ['ok', 'denied'],
      async (region) => {
        if (region === 'denied') {
          throw new Error('AccessDenied');
        }

        return [{ region }];
      },
    );

    expect(result).toEqual([{ region: 'ok' }]);
    expect(debugMock).toHaveBeenCalledWith(
      'Skipping AWS region due to permission error',
      expect.objectContaining({
        region: 'denied',
        error: expect.any(Error),
      }),
    );
  });

  test('returns empty array when every region fails with permission errors', async () => {
    const result = await fetchArraysAcrossRegions(
      ['r1', 'r2'],
      async (region) => {
        throw new Error(`${region} AccessDenied`);
      },
    );

    expect(result).toEqual([]);
    expect(debugMock).toHaveBeenCalledTimes(2);
  });

  test('rethrows non-permission failures', async () => {
    await expect(
      fetchArraysAcrossRegions(['r1', 'r2'], async (region) => {
        if (region === 'r1') {
          return [{ region }];
        }

        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(debugMock).not.toHaveBeenCalled();
  });
});
