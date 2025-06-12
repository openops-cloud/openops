import { telemetry } from '../telemetry';

export type ConnectionBase = {
  blockName: string;
  projectId: string;
};

export enum ConnectionEventName {
  CONNECTION_CREATED = 'connection_created',
  CONNECTION_DELETED = 'connection_deleted',
  CONNECTION_UPDATED = 'connection_updated',
}

export function sendConnectionCreatedEvent(
  userId: string,
  projectId: string,
  authProviderKey: string,
): void {
  telemetry.trackEvent({
    name: ConnectionEventName.CONNECTION_CREATED,
    labels: {
      userId,
      projectId,
      authProviderKey,
    },
  });
}

export function sendConnectionUpdatedEvent(
  userId: string,
  projectId: string,
  authProviderKey: string,
): void {
  telemetry.trackEvent({
    name: ConnectionEventName.CONNECTION_UPDATED,
    labels: {
      userId,
      projectId,
      authProviderKey,
    },
  });
}

export function sendConnectionDeletedEvent(
  userId: string,
  projectId: string,
  authProviderKey: string,
): void {
  telemetry.trackEvent({
    name: ConnectionEventName.CONNECTION_DELETED,
    labels: {
      userId,
      projectId,
      authProviderKey,
    },
  });
}
