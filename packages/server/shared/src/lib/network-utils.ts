import { FastifyRequest } from 'fastify';
import dns from 'node:dns/promises';
import { AppSystemProp, SharedSystemProp, system } from './system';

const GOOGLE_DNS = '216.239.32.10';
const PUBLIC_IP_ADDRESS_QUERY = 'o-o.myaddr.l.google.com';
const CLIENT_REAL_IP_HEADER = system.getOrThrow(
  AppSystemProp.CLIENT_REAL_IP_HEADER,
);

type IpMetadata = {
  ip: string;
};

let ipMetadata: IpMetadata | undefined;

const getPublicIp = async (): Promise<IpMetadata> => {
  if (ipMetadata !== undefined) {
    return ipMetadata;
  }

  dns.setServers([GOOGLE_DNS]);

  const ipList = await dns.resolve(PUBLIC_IP_ADDRESS_QUERY, 'TXT');

  ipMetadata = {
    ip: ipList[0][0],
  };

  return ipMetadata;
};

const extractClientRealIp = (request: FastifyRequest): string => {
  return request.headers[CLIENT_REAL_IP_HEADER] as string;
};

const appendSlashAndApi = (url: string): string => {
  const slash = url.endsWith('/') ? '' : '/';
  return `${url}${slash}api/`;
};

const getInternalApiUrl = (): string => {
  if (system.isApp()) {
    return process.env['OPS_SERVER_API_URL'] ?? 'http://127.0.0.1:3000/';
  }

  if (system.isWorker() && process.env['OPS_SERVER_API_URL']) {
    return process.env['OPS_SERVER_API_URL'];
  }

  const url = system.getOrThrow(SharedSystemProp.FRONTEND_URL);
  return appendSlashAndApi(url);
};

const getPublicUrl = async (): Promise<string> => {
  const publicBackendUrl = system.get(
    SharedSystemProp.INTERNAL_BACKEND_PUBLIC_URL,
  );
  if (publicBackendUrl) {
    const slash = publicBackendUrl.endsWith('/') ? '' : '/';
    return `${publicBackendUrl}${slash}`;
  }

  return appendSlashAndApi(system.getOrThrow(SharedSystemProp.FRONTEND_URL));
};

export const networkUtls = {
  getPublicUrl,
  extractClientRealIp,
  getInternalApiUrl,
  getPublicIp,
};
