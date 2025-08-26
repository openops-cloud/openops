const compressMock = jest.fn();
const decompressMock = jest.fn();
jest.mock('../src/lib/file-compressor', () => ({
  fileCompressor: {
    compress: compressMock,
    decompress: decompressMock,
  },
}));

const encryptBufferMock = jest.fn();
const decryptBufferMock = jest.fn();
jest.mock('../src/lib/security/encryption', () => ({
  encryptUtils: {
    encryptBuffer: encryptBufferMock,
    decryptBuffer: decryptBufferMock,
  },
}));

import { FileCompression } from '@openops/shared';
import {
  compressAndEncrypt,
  decryptAndDecompress,
} from '../src/lib/security/encrypt-compress';

describe('Object Transformer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should compress and encrypt the object', async () => {
    const testObject = { test: 'data' };
    const compressedBuffer = Buffer.from('compressed-data');
    const encryptedObject = { iv: 'test-iv', data: 'encrypted-data' };

    compressMock.mockResolvedValue(compressedBuffer);
    encryptBufferMock.mockReturnValue(encryptedObject);

    const result = await compressAndEncrypt(testObject);

    expect(encryptBufferMock).toHaveBeenCalledWith(compressedBuffer);
    expect(compressMock).toHaveBeenCalledWith({
      data: Buffer.from(JSON.stringify(testObject)),
      compression: FileCompression.PACK_BROTLI,
    });
    expect(result).toBe(encryptedObject);
  });

  it('should decrypt and decompress the object', async () => {
    const decryptedBuffer = Buffer.from(JSON.stringify('compressed-buffer'));
    const encryptedObject = { iv: 'test-iv', data: 'encrypted-data' };

    const originalObject = { test: 'data' };
    const originalBuffer = Buffer.from(JSON.stringify(originalObject));

    decryptBufferMock.mockReturnValue(decryptedBuffer);
    decompressMock.mockResolvedValue(originalBuffer);

    const result = await decryptAndDecompress(encryptedObject);

    expect(decryptBufferMock).toHaveBeenCalledWith(encryptedObject);

    expect(decompressMock).toHaveBeenCalledWith({
      data: decryptedBuffer,
      compression: FileCompression.PACK_BROTLI,
    });

    expect(result).toStrictEqual(originalObject);
  });

  it('should handle empty objects', async () => {
    const emptyObject = {};
    const originalBuffer = Buffer.from(JSON.stringify(emptyObject));

    const compressedBuffer = Buffer.from('compressed-empty');
    const encryptedEmpty = { iv: 'test-iv', data: 'encrypted-empty' };

    compressMock.mockResolvedValue(compressedBuffer);
    encryptBufferMock.mockReturnValue(encryptedEmpty);

    decryptBufferMock.mockReturnValue(compressedBuffer);
    decompressMock.mockResolvedValue(originalBuffer);

    const compressed = await compressAndEncrypt(emptyObject);

    const decompressed = await decryptAndDecompress(compressed);

    expect(compressed).toBe(encryptedEmpty);
    expect(decompressed).toStrictEqual(emptyObject);
  });

  it('should handle null values', async () => {
    const nullValue = null;
    const originalBuffer = Buffer.from(JSON.stringify(nullValue));

    const compressedBuffer = Buffer.from('compressed-null');
    const encryptedNull = { iv: 'test-iv', data: 'encrypted-null' };

    compressMock.mockResolvedValue(compressedBuffer);
    encryptBufferMock.mockReturnValue(encryptedNull);

    decryptBufferMock.mockReturnValue(compressedBuffer);
    decompressMock.mockResolvedValue(originalBuffer);

    const compressed = await compressAndEncrypt(nullValue);
    const decompressed = await decryptAndDecompress(compressed);

    expect(compressed).toBe(encryptedNull);
    expect(decompressed).toStrictEqual(nullValue);
  });
});
