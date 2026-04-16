import { logger } from '@openops/server-shared';
import { Redis } from 'ioredis';

export const redisPubSub = (
  redisClientSubscriber: Redis,
  redisClientPublisher: Redis,
) => {
  return {
    async subscribe(
      channel: string,
      listener: (channel: string, message: string) => Promise<void>,
    ): Promise<void> {
      await redisClientSubscriber.subscribe(channel);
      redisClientSubscriber.on('message', (channel, message) => {
        listener(channel, message).catch((err) => {
          logger.error('Error while processing Redis pub/sub message', err);
        });
      });
    },
    async publish(channel: string, message: string): Promise<void> {
      await redisClientPublisher.publish(channel, message);
    },
    async unsubscribe(channel: string): Promise<void> {
      await redisClientSubscriber.unsubscribe(channel);
    },
  };
};
