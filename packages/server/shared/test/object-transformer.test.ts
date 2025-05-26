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

describe('Object Transformer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should encrypt and compress the object', async () => {
    const testObject = { test: 'data' };
    const encryptedObject = { iv: 'test-iv', data: 'encrypted-data' };
    const compressedObject = Buffer.from('compressed-data');

    encryptObjectMock.mockReturnValue(encryptedObject);
    compressMock.mockResolvedValue(compressedObject);

    const result = await encryptAndCompress(testObject);

    expect(encryptObjectMock).toHaveBeenCalledWith(testObject);
    expect(compressMock).toHaveBeenCalledWith({
      data: Buffer.from(JSON.stringify(encryptedObject)),
      compression: FileCompression.GZIP,
    });
    expect(result).toBe(compressedObject);
  });

  it('should decompress and decrypt the object', async () => {
    const compressedObject = Buffer.from('compressed-data');
    const decompressedObject = Buffer.from(
      JSON.stringify({ iv: 'test-iv', data: 'encrypted-data' }),
    );
    const decryptedObject = { test: 'data' };

    decompressMock.mockResolvedValue(decompressedObject);
    decryptObjectMock.mockReturnValue(decryptedObject);

    const result = await decompressAndDecrypt(compressedObject);

    expect(decompressMock).toHaveBeenCalledWith({
      data: compressedObject,
      compression: FileCompression.GZIP,
    });
    expect(decryptObjectMock).toHaveBeenCalledWith(
      JSON.parse(decompressedObject.toString()),
    );
    expect(result).toBe(decryptedObject);
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
