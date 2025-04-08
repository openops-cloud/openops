import { UserMeta } from '@openops/shared';
import { api } from './api';

type TrackEventsRequest = {
  trackEvents: boolean;
};

export const usersApi = {
  me: async () => {
    return await api.get<UserMeta>('/v1/users/me');
  },
  setTelemetry: async ({ trackEvents }: TrackEventsRequest) => {
    return await api.patch<TrackEventsRequest>('/v1/users/tracking-events', {
      trackEvents: trackEvents,
    });
  },
};
