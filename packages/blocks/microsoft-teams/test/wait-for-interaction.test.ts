import { StoreScope } from '@openops/blocks-framework';
import { waitForInteraction } from '../src/lib/common/wait-for-interaction';

const mockContext = {
  store: {
    put: jest.fn(),
  },
  run: {
    pause: jest.fn(),
    pauseId: 'mock-pause-id',
  },
} as any;

const mockMessageObj = { id: 'mock-message-id' };
const mockExecutionPath = 'mock-execution-path';

describe('waitForInteraction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should wait for interaction and store pause metadata', async () => {
    const timeoutInDays = 3;
    const messageExpiryDateInUtc = new Date(
      Date.now() + timeoutInDays * 24 * 60 * 60 * 1000,
    );

    const result = await waitForInteraction(
      mockMessageObj,
      timeoutInDays,
      mockContext,
      mockExecutionPath,
    );

    const expectedPauseMetadata = {
      executionCorrelationId: mockContext.run.pauseId,
      resumeDateTime: messageExpiryDateInUtc.toString(),
    };

    expect(mockContext.store.put).toHaveBeenCalledWith(
      `pauseMetadata_${mockExecutionPath}`,
      expectedPauseMetadata,
      StoreScope.FLOW_RUN,
    );

    expect(mockContext.run.pause).toHaveBeenCalledWith({
      pauseMetadata: expectedPauseMetadata,
    });

    expect(result).toEqual({
      action: '',
      isExpired: undefined,
      message: mockMessageObj,
    });
  });
});
