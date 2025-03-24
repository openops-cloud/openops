import { telemetry } from '../telemetry';

export type UserBase = {
  userId: string;
  organizationId: string;
};

export enum UserEventName {
  USER_CREATED = 'user_created',
}

export function sendUserCreatedEvent(
  userId: string,
  organizationId: string | null,
): void {
  telemetry.trackEvent({
    name: UserEventName.USER_CREATED,
    labels: {
      userId,
      organizationId: organizationId ?? '',
    },
  });
}
