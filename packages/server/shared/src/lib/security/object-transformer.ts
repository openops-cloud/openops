import { FileCompression } from '@openops/shared';
import { fileCompressor } from '../file-compressor';
import { encryptUtils } from './encryption';

/**
 * Encrypt and compress an object
 * @param obj object to encrypt and compress
 */
export async function encryptAndCompress(obj: unknown): Promise<Buffer> {
  const encryptOutput = encryptUtils.encryptObject(obj);
  const binaryOutput = Buffer.from(JSON.stringify(encryptOutput));

  return fileCompressor.compress({
    data: binaryOutput,
    compression: FileCompression.GZIP,
  });
}

/**
 * Restores the buffer to its original format
 * @param buffer compressed and encrypted buffer
 */
export async function decompressAndDecrypt(buffer: Buffer): Promise<unknown> {
  const decompressed = await fileCompressor.decompress({
    data: buffer,
    compression: FileCompression.GZIP,
  });

  const parsedEncryptedOutput = JSON.parse(decompressed.toString());
  return encryptUtils.decryptObject(parsedEncryptedOutput);
}
