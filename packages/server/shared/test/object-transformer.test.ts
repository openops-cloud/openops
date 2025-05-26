const compressMock = jest.fn();
const decompressMock = jest.fn();
jest.mock('../src/lib/file-compressor', () => ({
  fileCompressor: {
    compress: compressMock,
    decompress: decompressMock,
  },
}));

const encryptObjectMock = jest.fn();
const decryptObjectMock = jest.fn();
jest.mock('../src/lib/security/encryption', () => ({
  encryptUtils: {
    encryptObject: encryptObjectMock,
    decryptObject: decryptObjectMock,
  },
}));

import { FileCompression } from '@openops/shared';
import {
  decompressAndDecrypt,
  encryptAndCompress,
} from '../src/lib/security/object-transformer';

describe('stepOutputTransformer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should encrypt and compress the output', async () => {
    const testOutput = { test: 'data' };
    const encryptedOutput = { iv: 'test-iv', data: 'encrypted-data' };
    const compressedOutput = Buffer.from('compressed-data');

    encryptObjectMock.mockReturnValue(encryptedOutput);
    compressMock.mockResolvedValue(compressedOutput);

    const result = await encryptAndCompress(testOutput);

    expect(encryptObjectMock).toHaveBeenCalledWith(testOutput);
    expect(compressMock).toHaveBeenCalledWith({
      data: Buffer.from(JSON.stringify(encryptedOutput)),
      compression: FileCompression.GZIP,
    });
    expect(result).toBe(compressedOutput);
  });

  it('should decompress and decrypt the output', async () => {
    const compressedOutput = Buffer.from('compressed-data');
    const decompressedOutput = Buffer.from(
      JSON.stringify({ iv: 'test-iv', data: 'encrypted-data' }),
    );
    const decryptedOutput = { test: 'data' };

    decompressMock.mockResolvedValue(decompressedOutput);
    decryptObjectMock.mockReturnValue(decryptedOutput);

    const result = await decompressAndDecrypt(compressedOutput);

    expect(decompressMock).toHaveBeenCalledWith({
      data: compressedOutput,
      compression: FileCompression.GZIP,
    });
    expect(decryptObjectMock).toHaveBeenCalledWith(
      JSON.parse(decompressedOutput.toString()),
    );
    expect(result).toBe(decryptedOutput);
  });

  it('should handle empty objects', async () => {
    const emptyObject = {};
    const encryptedEmpty = { iv: 'test-iv', data: 'encrypted-empty' };
    const compressedEmpty = Buffer.from('compressed-empty');
    const decompressedEmpty = Buffer.from(JSON.stringify(encryptedEmpty));

    encryptObjectMock.mockReturnValue(encryptedEmpty);
    compressMock.mockResolvedValue(compressedEmpty);
    decompressMock.mockResolvedValue(decompressedEmpty);
    decryptObjectMock.mockReturnValue(emptyObject);

    const compressed = await encryptAndCompress(emptyObject);
    const decompressed = await decompressAndDecrypt(compressed);

    expect(compressed).toBe(compressedEmpty);
    expect(decompressed).toBe(emptyObject);
  });

  it('should handle null values', async () => {
    const nullValue = null;
    const encryptedNull = { iv: 'test-iv', data: 'encrypted-null' };
    const compressedNull = Buffer.from('compressed-null');
    const decompressedNull = Buffer.from(JSON.stringify(encryptedNull));

    encryptObjectMock.mockReturnValue(encryptedNull);
    compressMock.mockResolvedValue(compressedNull);
    decompressMock.mockResolvedValue(decompressedNull);
    decryptObjectMock.mockReturnValue(nullValue);

    const compressed = await encryptAndCompress(nullValue);
    const decompressed = await decompressAndDecrypt(compressed);

    expect(compressed).toBe(compressedNull);
    expect(decompressed).toBe(nullValue);
  });
});
