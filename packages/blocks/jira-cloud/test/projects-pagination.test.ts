import { httpClient } from '@openops/blocks-common';
import { getProjects } from '../src/lib/common';

jest.mock('@openops/blocks-common', () => {
  const actual = jest.requireActual('@openops/blocks-common');
  return {
    ...actual,
    httpClient: {
      ...actual.httpClient,
      sendRequest: jest.fn(),
    },
  };
});

const auth = {
  instanceUrl: 'https://example.atlassian.net',
  email: 'user@example.com',
  apiToken: 'token',
};

describe('getProjects pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('aggregates projects across multiple pages using startAt/total', async () => {
    const page1: {
      values: Array<{ id: string; name: string }>;
      startAt: number;
      maxResults: number;
      total: number;
    } = {
      values: [
        { id: '1', name: 'P1' },
        { id: '2', name: 'P2' },
      ],
      startAt: 0,
      maxResults: 2,
      total: 5,
    };
    const page2: {
      values: Array<{ id: string; name: string }>;
      startAt: number;
      maxResults: number;
      total: number;
    } = {
      values: [
        { id: '3', name: 'P3' },
        { id: '4', name: 'P4' },
      ],
      startAt: 2,
      maxResults: 2,
      total: 5,
    };
    const page3: {
      values: Array<{ id: string; name: string }>;
      startAt: number;
      maxResults: number;
      total: number;
    } = {
      values: [{ id: '5', name: 'P5' }],
      startAt: 4,
      maxResults: 1,
      total: 5,
    };

    (httpClient.sendRequest as jest.Mock)
      .mockResolvedValueOnce({ body: page1 })
      .mockResolvedValueOnce({ body: page2 })
      .mockResolvedValueOnce({ body: page3 });

    const projects = await getProjects(auth as any);

    expect(httpClient.sendRequest).toHaveBeenCalledTimes(3);
    expect(projects.map((p: any) => p.id)).toEqual(['1', '2', '3', '4', '5']);
  });

  test('handles empty final page gracefully', async () => {
    const page1: {
      values: Array<{ id: string; name: string }>;
      startAt: number;
      maxResults: number;
      total: number;
    } = {
      values: [{ id: '1', name: 'P1' }],
      startAt: 0,
      maxResults: 1,
      total: 1,
    };

    (httpClient.sendRequest as jest.Mock).mockResolvedValueOnce({
      body: page1,
    });

    const projects = await getProjects(auth as any);
    expect(httpClient.sendRequest).toHaveBeenCalledTimes(1);
    expect(projects).toHaveLength(1);
  });
});
