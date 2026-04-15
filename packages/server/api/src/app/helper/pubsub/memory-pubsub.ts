import { logger } from '@openops/server-shared';

const subscriptions = new Map<
  string,
  ((channel: string, message: string) => Promise<void>)[]
>();

export const memoryPubSub = {
  async subscribe(
    channel: string,
    listener: (channel: string, message: string) => Promise<void>,
  ): Promise<void> {
    if (!subscriptions.has(channel)) {
      subscriptions.set(channel, []);
    }
    subscriptions.get(channel)?.push(listener);
  },

  async publish(channel: string, message: string): Promise<void> {
    const listeners = subscriptions.get(channel);
    if (listeners) {
      const results = await Promise.allSettled(
        [...listeners].map((listener) => listener(channel, message)),
      );

      results
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected',
        )
        .forEach((result) => {
          logger.error('Error while processing Memory pub/sub message', result);
        });
    }
  },
  async unsubscribe(channel: string): Promise<void> {
    subscriptions.delete(channel);
  },
};
