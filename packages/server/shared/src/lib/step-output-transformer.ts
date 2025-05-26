import { FileCompression } from '@openops/shared';
import { fileCompressor } from './file-compressor';
import { encryptUtils } from './security/encryption';

export const stepOutputStringEncoding = 'base64';

export const stepOutputTransformer = {
  async encryptAndCompress(output: unknown): Promise<Buffer> {
    const encryptOutput = encryptUtils.encryptObject(output);
    const binaryOutput = Buffer.from(JSON.stringify(encryptOutput));

    return fileCompressor.compress({
      data: binaryOutput,
      compression: FileCompression.GZIP,
    });
  },

  async decompressAndDecrypt(output: Buffer): Promise<unknown> {
    const decompressed = await fileCompressor.decompress({
      data: output,
      compression: FileCompression.GZIP,
    });

    const parsedEncryptedOutput = JSON.parse(decompressed.toString());
    return encryptUtils.decryptObject(parsedEncryptedOutput);
  },

  async encryptAndCompressToEncodedString(output: unknown): Promise<string> {
    const buffer = await this.encryptAndCompress(output);

    return buffer.toString(stepOutputStringEncoding);
  },

  async decompressAndDecryptEncodedString(output: string): Promise<unknown> {
    const buffer = Buffer.from(output, stepOutputStringEncoding);

    return this.decompressAndDecrypt(buffer);
  },
};
