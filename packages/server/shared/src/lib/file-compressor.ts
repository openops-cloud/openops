import { FileCompression } from '@openops/shared';
import { pack, unpack } from 'msgpackr';
import { promisify } from 'node:util';
import {
  brotliCompress,
  brotliDecompress,
  gzip as gzipCallback,
  unzip as unzipCallback,
  constants as zc,
} from 'node:zlib';

const gzip = promisify(gzipCallback);
const unzip = promisify(unzipCallback);
const brCompress = promisify(brotliCompress);
const brDecompress = promisify(brotliDecompress);

const BROTLI_OPTS = {
  params: {
    [zc.BROTLI_PARAM_QUALITY]: 4, // Compression level from 0…11
  },
};

export const fileCompressor = {
  async compress({ data, compression }: Params): Promise<Buffer> {
    switch (compression) {
      case FileCompression.NONE:
        return data;
      case FileCompression.GZIP: {
        return gzip(data);
      }
      case FileCompression.PACK_BROTLI: {
        const packed = pack(data);

        const packedBuf = Buffer.isBuffer(packed)
          ? packed
          : Buffer.from(packed);

        return brCompress(packedBuf, BROTLI_OPTS);
      }
    }
  },

  async decompress({ data, compression }: Params): Promise<Buffer> {
    switch (compression) {
      case FileCompression.NONE:
        return data;
      case FileCompression.GZIP:
        return unzip(data);
      case FileCompression.PACK_BROTLI: {
        const body = await brDecompress(data);
        return unpack(body);
      }
    }
  },
};

type Params = {
  data: Buffer;
  compression: FileCompression;
};
