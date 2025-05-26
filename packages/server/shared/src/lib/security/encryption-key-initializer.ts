import { AppSystemProp, QueueMode, system } from '../system';
import { encryptUtils } from './encryption';

export async function encryptionKeyInitializer(): Promise<void> {
  const queueMode = system.getOrThrow<QueueMode>(AppSystemProp.QUEUE_MODE);
  const encryptionKey = await encryptUtils.loadEncryptionKey(queueMode);
  const isValidHexKey =
    encryptionKey && /^[A-Fa-z0-9]{32}$/.test(encryptionKey);

  if (!isValidHexKey) {
    throw new Error(
      JSON.stringify({
        message:
          'OPS_ENCRYPTION_KEY is either undefined or not a valid 32 hex string.',
      }),
    );
  }
}
