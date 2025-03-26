import { AppSystemProp, QueueMode, system } from '../system';
import { memoryWrapper } from './memory-wrapper';
import { redisWrapper } from './redis-wrapper';

const isRedisConfigured =
  system.get<QueueMode>(AppSystemProp.QUEUE_MODE) === QueueMode.REDIS;

export const cacheWrapper = isRedisConfigured ? redisWrapper : memoryWrapper;
