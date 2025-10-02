import { logger } from '@openops/server-shared';
import { Principal, WebsocketServerEvent } from '@openops/shared';
import * as cookie from 'cookie';
import { Socket } from 'socket.io';
import { accessTokenManager } from '../authentication/lib/access-token-manager';

export type WebsocketListener<T> = (
  socket: Socket,
) => (data: T) => Promise<void>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const listener: Record<string, WebsocketListener<any>> = {};

export const websocketService = {
  async init(socket: Socket): Promise<void> {
    const principal = await getPrincipalFromWebsocket(socket);

    await socket.join(principal.projectId);
    for (const [event, handler] of Object.entries(listener)) {
      socket.on(event, handler(socket));
    }
  },
  addListener<T>(
    event: WebsocketServerEvent,
    handler: WebsocketListener<T>,
  ): void {
    listener[event] = handler;
  },
};

export async function getPrincipalFromWebsocket(
  socket: Socket,
): Promise<Principal> {
  let principal: Principal | undefined;
  const rawCookies = socket.request.headers.cookie;
  if (!rawCookies) {
    throw new Error('Authentication cookie not provided.');
  }

  try {
    const parsedCookies = cookie.parse(rawCookies);
    const token = parsedCookies['token'];
    if (!token) {
      throw new Error('Authentication token not found in cookies.');
    }
    principal = await accessTokenManager.extractPrincipal(token);
  } catch (e) {
    logger.debug('Failed to extract principal from the socket.', {
      handshake: socket.handshake,
    });
    throw e;
  }

  return principal;
}
