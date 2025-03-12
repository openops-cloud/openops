import { api } from './api';

type TrackEventsRequest = {
  trackEvents: boolean;
};

export const usersApi = {
  setTelemetry: async ({ trackEvents }: TrackEventsRequest) => {
    return await api.patch<TrackEventsRequest>('/v1/users/tracking-events', {
      trackEvents: trackEvents,
    });
  },
};
