import { FileCompression } from '@openops/shared';
import { fileCompressor } from '../file-compressor';
import { encryptUtils } from '../security/encryption';

export const stepOutputTransformer = {
  /**
   * Prepare the output of a block to be saved in the database
   * @param output test output of a block
   */
  async encryptAndCompress(output: unknown): Promise<Buffer> {
    const encryptOutput = encryptUtils.encryptObject(output);
    const binaryOutput = Buffer.from(JSON.stringify(encryptOutput));

    return fileCompressor.compress({
      data: binaryOutput,
      compression: FileCompression.GZIP,
    });
  },

  /**
   * Restores the output of a block to its original format
   * @param output buffer saved on the database
   */
  async decompressAndDecrypt(output: Buffer): Promise<unknown> {
    const decompressed = await fileCompressor.decompress({
      data: output,
      compression: FileCompression.GZIP,
    });

    const parsedEncryptedOutput = JSON.parse(decompressed.toString());
    return encryptUtils.decryptObject(parsedEncryptedOutput);
  },
};
