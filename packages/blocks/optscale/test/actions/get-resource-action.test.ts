import { HttpMethod } from '@openops/blocks-common';
import { getResourceAction } from '../../src/lib/actions/get-resource-action';
import { sendOptScaleRequest } from '../../src/lib/common/make-request';
import { auth, createContext } from './test-helpers';

jest.mock('../../src/lib/common/make-request', () => ({
  ...jest.requireActual('../../src/lib/common/make-request'),
  sendOptScaleRequest: jest.fn(),
}));

const sendMock = sendOptScaleRequest as jest.Mock;

describe('getResourceAction', () => {
  beforeEach(() => jest.clearAllMocks());

  test('gets resource details by OptScale resource ID', async () => {
    sendMock.mockResolvedValue({ id: 'r-1', employee_id: 'e-1' });

    const result = await getResourceAction.run(
      createContext({ resourceId: ' r-1 ' }),
    );

    expect(result).toEqual({ id: 'r-1', employee_id: 'e-1' });
    expect(sendMock).toHaveBeenCalledWith({
      auth,
      method: HttpMethod.GET,
      path: '/cloud_resources/r-1',
      query: { details: true },
    });
  });

  test('encodes the resource ID in the path', async () => {
    sendMock.mockResolvedValue({});

    await getResourceAction.run(createContext({ resourceId: 'a/b' }));

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/cloud_resources/a%2Fb' }),
    );
  });

  test('is a read-only action', () => {
    expect(getResourceAction.isWriteAction).toBe(false);
  });
});
