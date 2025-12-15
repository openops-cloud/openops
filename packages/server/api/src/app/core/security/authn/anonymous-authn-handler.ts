import { FastifyRequest } from 'fastify';
import { BaseSecurityHandler } from '../security-handler';

export class AnonymousAuthnHandler extends BaseSecurityHandler {
  protected canHandle(_request: FastifyRequest): Promise<boolean> {
    return Promise.resolve(true);
  }

  protected doHandle(_request: FastifyRequest): Promise<void> {
    return Promise.resolve();
  }
}
