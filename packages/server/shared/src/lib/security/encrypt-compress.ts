import { FileCompression } from '@openops/shared';
import { fileCompressor } from '../file-compressor';
import { EncryptedObject, encryptUtils } from './encryption';

/**
 * Compress and encrypt an object
 * @param obj object to encrypt and compress
 */
export async function compressAndEncrypt(
  obj: unknown,
): Promise<EncryptedObject> {
  const compressed = await fileCompressor.compress({
    data: Buffer.from(JSON.stringify(obj)),
    compression: FileCompression.PACK_BROTLI,
  });

  return encryptUtils.encryptBuffer(compressed);
}

/**
 * Restores the buffer to its original format
 * @param obj compressed and encrypted object
 */
export async function decryptAndDecompress(
  obj: EncryptedObject,
): Promise<unknown> {
  const compressedBuffer = encryptUtils.decryptBuffer(obj);

  const originalBuffer = await fileCompressor.decompress({
    data: compressedBuffer,
    compression: FileCompression.PACK_BROTLI,
  });

  return JSON.parse(originalBuffer.toString());
}
