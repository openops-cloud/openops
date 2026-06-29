import { api } from '@/app/lib/api';
import { BlockOptionRequest } from '@openops/shared';
import { blocksApi } from '../lib/blocks-api';

jest.mock('@/app/lib/api', () => ({
  api: { post: jest.fn() },
}));

const mockedPost = api.post as jest.Mock;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('blocksApi.options', () => {
  beforeEach(() => {
    mockedPost.mockReset();
  });

  it('caps concurrent /options requests, queueing the rest', async () => {
    const resolvers: Array<() => void> = [];
    mockedPost.mockImplementation(
      () => new Promise<void>((resolve) => resolvers.push(resolve)),
    );

    const requests = Array.from({ length: 6 }, () =>
      blocksApi.options({} as BlockOptionRequest),
    );
    requests.forEach((p) => p.catch(() => undefined));

    await flush();
    // Only 4 reach the API; the remaining 2 wait for a free slot.
    expect(mockedPost).toHaveBeenCalledTimes(4);

    // Each completed request lets exactly one queued request proceed.
    resolvers[0]();
    await flush();
    expect(mockedPost).toHaveBeenCalledTimes(5);

    resolvers[1]();
    await flush();
    expect(mockedPost).toHaveBeenCalledTimes(6);

    resolvers.forEach((resolve) => resolve());
    await Promise.all(requests);
  });
});
