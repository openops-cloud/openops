import { encryptUtils } from './encryption';

export async function encryptionKeyInitializer(): Promise<void> {
  const encryptionKey = encryptUtils.loadEncryptionKey();
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
