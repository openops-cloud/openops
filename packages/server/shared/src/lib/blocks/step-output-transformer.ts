import {
  FileCompression,
  FlowStepTestOutput,
  OpenOpsId,
} from '@openops/shared';
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

  encodeTestOutputs(
    testOutputs: FlowStepTestOutput[],
  ): Record<OpenOpsId, string> {
    return Object.fromEntries(
      testOutputs.map((testOutput) => [
        testOutput.stepId as OpenOpsId,
        (testOutput.output as Buffer).toString('base64'),
      ]),
    );
  },

  decodeTestOutputs(
    testOutputs: Record<OpenOpsId, string>,
  ): Record<OpenOpsId, Buffer> {
    const decoded: Record<OpenOpsId, Buffer> = {};

    for (const [key, base64Value] of Object.entries(testOutputs)) {
      decoded[key as OpenOpsId] = Buffer.from(base64Value, 'base64');
    }

    return decoded;
  },
};
