const makeOpenOpsTablesRequestMock = jest.fn();
const createAxiosHeadersMock = jest.fn();

jest.mock('../../src/lib/openops-tables/requests-helpers', () => ({
  ...jest.requireActual('../../src/lib/openops-tables/requests-helpers'),
  makeOpenOpsTablesRequest: makeOpenOpsTablesRequestMock,
}));

jest.mock('../../src/lib/openops-tables/create-axios-headers', () => ({
  createAxiosHeaders: createAxiosHeadersMock,
}));

jest.mock('@openops/server-shared', () => ({
  ...jest.requireActual('@openops/server-shared'),
  logger: {
    ...jest.requireActual('@openops/server-shared').logger,
    error: jest.fn(),
  },
}));

import { logger } from '@openops/server-shared';
import {
  FilterType,
  ViewFilterTypesEnum,
} from '../../src/lib/openops-tables/filters';
import { getRowsPage } from '../../src/lib/openops-tables/rows';

const HEADERS = { Authorization: 'Token abc' };

describe('getRowsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createAxiosHeadersMock.mockReturnValue(HEADERS);
  });

  function requestedUrl(): URL {
    const [, url] = makeOpenOpsTablesRequestMock.mock.calls[0];
    return new URL(`http://tables/${url}`);
  }

  it('fetches exactly one page and reports whether more exist', async () => {
    makeOpenOpsTablesRequestMock.mockResolvedValue({
      count: 250,
      next: 'http://tables/api/database/rows/table/7/?page=2',
      results: [{ id: 1, Name: 'a' }],
    });

    const page = await getRowsPage({ tableId: 7, tokenOrResolver: 'tok' });

    expect(page).toEqual({
      count: 250,
      hasMore: true,
      results: [{ id: 1, Name: 'a' }],
    });
    expect(makeOpenOpsTablesRequestMock).toHaveBeenCalledTimes(1);
    expect(makeOpenOpsTablesRequestMock).toHaveBeenCalledWith(
      'GET',
      expect.stringMatching(/^api\/database\/rows\/table\/7\/\?/),
      undefined,
      HEADERS,
    );
  });

  it('reports no more pages when Baserow returns a null next link', async () => {
    makeOpenOpsTablesRequestMock.mockResolvedValue({
      count: 1,
      next: null,
      results: [],
    });

    const page = await getRowsPage({ tableId: 7, tokenOrResolver: 'tok' });

    expect(page.hasMore).toBe(false);
  });

  it('encodes filters, combinator, search and paging as Baserow query params', async () => {
    makeOpenOpsTablesRequestMock.mockResolvedValue({
      count: 0,
      next: null,
      results: [],
    });

    await getRowsPage({
      tableId: 7,
      tokenOrResolver: 'tok',
      filters: [
        { fieldName: 'Status', type: ViewFilterTypesEnum.equal, value: 'open' },
        { fieldName: 'Owner', type: ViewFilterTypesEnum.empty },
      ],
      filterType: FilterType.OR,
      search: 'prod',
      page: 3,
      size: 50,
    });

    const params = requestedUrl().searchParams;
    expect(params.get('user_field_names')).toBe('true');
    expect(params.get('filter__Status__equal')).toBe('open');
    expect(params.get('filter__Owner__empty')).toBe('');
    expect(params.get('filter_type')).toBe('OR');
    expect(params.get('search')).toBe('prod');
    expect(params.get('page')).toBe('3');
    expect(params.get('size')).toBe('50');
  });

  it('joins list values with commas, as Baserow expects for any-of operators', async () => {
    makeOpenOpsTablesRequestMock.mockResolvedValue({
      count: 0,
      next: null,
      results: [],
    });

    await getRowsPage({
      tableId: 7,
      tokenOrResolver: 'tok',
      filters: [
        {
          fieldName: 'Status',
          type: ViewFilterTypesEnum.single_select_is_any_of,
          value: ['open', 7],
        },
      ],
    });

    expect(
      requestedUrl().searchParams.get(
        'filter__Status__single_select_is_any_of',
      ),
    ).toBe('open,7');
  });

  it('refuses several filters without a combinator, before any request is made', async () => {
    await expect(
      getRowsPage({
        tableId: 7,
        tokenOrResolver: 'tok',
        filters: [
          { fieldName: 'A', type: ViewFilterTypesEnum.equal, value: 1 },
          { fieldName: 'B', type: ViewFilterTypesEnum.equal, value: 2 },
        ],
      }),
    ).rejects.toThrow('Filter type must be provided when filters are provided');

    expect(makeOpenOpsTablesRequestMock).not.toHaveBeenCalled();
  });

  it('logs and rethrows when Baserow fails', async () => {
    makeOpenOpsTablesRequestMock.mockRejectedValue(new Error('boom'));

    await expect(
      getRowsPage({ tableId: 7, tokenOrResolver: 'tok' }),
    ).rejects.toThrow('boom');

    expect(logger.error).toHaveBeenCalledWith(
      'Error while getting rows page:',
      expect.objectContaining({ url: expect.stringContaining('table/7/') }),
    );
  });
});
