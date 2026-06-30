const errorMock = jest.fn();

jest.mock('@openops/server-shared', () => ({
  logger: {
    error: errorMock,
  },
}));

import {
  ParentMessage,
  ParentMessageSender,
  runEngineOperation,
  sendMessageToParent,
} from '../src/lib/engine-ipc';

const flushAsync = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

describe('runEngineOperation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('flushes the result to the worker before exiting on success', async () => {
    const sentMessages: ParentMessage[] = [];
    const pendingCallbacks: Array<(error: Error | null) => void> = [];
    const send: ParentMessageSender = (message, callback) => {
      sentMessages.push(message);
      pendingCallbacks.push(callback);
    };
    const exit = jest.fn();

    const operation = runEngineOperation('input-key', {
      execute: jest.fn().mockResolvedValue('result-key'),
      flushLogs: jest.fn().mockResolvedValue(undefined),
      send,
      exit,
    });

    await flushAsync();

    // The result has been handed to the IPC channel, but the channel has not
    // acknowledged the write yet — the engine must not exit, otherwise the
    // worker sees a clean exit with no result.
    expect(sentMessages).toEqual([{ type: 'result', resultKey: 'result-key' }]);
    expect(exit).not.toHaveBeenCalled();

    // Simulate the IPC channel flushing the message.
    pendingCallbacks.forEach((callback) => callback(null));
    await operation;

    expect(exit).toHaveBeenCalledWith(0);
  });

  it('flushes the error to the worker before exiting on failure', async () => {
    const sentMessages: ParentMessage[] = [];
    const pendingCallbacks: Array<(error: Error | null) => void> = [];
    const send: ParentMessageSender = (message, callback) => {
      sentMessages.push(message);
      pendingCallbacks.push(callback);
    };
    const exit = jest.fn();

    const operation = runEngineOperation('input-key', {
      execute: jest.fn().mockRejectedValue(new Error('boom')),
      flushLogs: jest.fn().mockResolvedValue(undefined),
      send,
      exit,
    });

    await flushAsync();

    expect(sentMessages).toEqual([{ type: 'error', message: 'boom' }]);
    expect(exit).not.toHaveBeenCalled();

    pendingCallbacks.forEach((callback) => callback(null));
    await operation;

    expect(exit).toHaveBeenCalledWith(1);
  });

  it('flushes logs before sending the result', async () => {
    const order: string[] = [];
    const send: ParentMessageSender = (_message, callback) => {
      order.push('send');
      callback(null);
    };

    await runEngineOperation('input-key', {
      execute: jest.fn().mockResolvedValue('result-key'),
      flushLogs: jest.fn().mockImplementation(async () => {
        order.push('flushLogs');
      }),
      send,
      exit: jest.fn(),
    });

    expect(order).toEqual(['flushLogs', 'send']);
  });
});

describe('sendMessageToParent', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resolves only after the IPC send is acknowledged', async () => {
    let acknowledge: ((error: Error | null) => void) | undefined;
    const send: ParentMessageSender = (_message, callback) => {
      acknowledge = callback;
    };

    let resolved = false;
    const promise = sendMessageToParent(send, {
      type: 'result',
      resultKey: 'k',
    }).then(() => {
      resolved = true;
    });

    await flushAsync();
    expect(resolved).toBe(false);

    acknowledge?.(null);
    await promise;
    expect(resolved).toBe(true);
  });

  it('logs and still resolves when the IPC send fails', async () => {
    const sendError = new Error('IPC channel closed');
    const send: ParentMessageSender = (_message, callback) => {
      callback(sendError);
    };

    await sendMessageToParent(send, { type: 'error', message: 'boom' });

    expect(errorMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ error: sendError, messageType: 'error' }),
    );
  });

  it('logs and still resolves when the IPC send throws synchronously', async () => {
    const sendError = new Error('channel closed');
    const send: ParentMessageSender = () => {
      throw sendError;
    };

    await sendMessageToParent(send, { type: 'result', resultKey: 'k' });

    expect(errorMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ error: sendError, messageType: 'result' }),
    );
  });
});
