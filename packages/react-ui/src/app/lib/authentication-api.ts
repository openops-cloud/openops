import { api } from '@/app/lib/api';
import {
  AuthenticationResponse,
  SignInRequest,
  SignUpRequest,
} from '@openops/shared';

export const authenticationApi = {
  signIn(request: SignInRequest) {
    return api.post<AuthenticationResponse>(
      '/v1/authentication/sign-in',
      request,
    );
  },
  signUp(request: SignUpRequest) {
    return api.post<AuthenticationResponse>(
      '/v1/authentication/sign-up',
      request,
    );
  },
  signOut() {
    return api.post<AuthenticationResponse>('/v1/authentication/sign-out');
  },
  fetchAnalyticsEmbedId() {
    return api.get<string>(
      `/v1/authentication/analytics-embed-id?timestamp=${new Date().getTime()}`,
    );
  },
  fetchAnalyticsGuestToken(dashboardEmbedUuid: string) {
    return api.get<string>(
      `/v1/authentication/analytics-guest-token?timestamp=${new Date().getTime()}`,
      {
        dashboardEmbedUuid,
      },
    );
  },
  resetPassword(request: { otp: string; userId: string; newPassword: string }) {
    return new Promise<void>((resolve) => {
      resolve();
    });
  },
  sendOtpEmail(request: { email: string; type: string }) {
    return new Promise<void>((resolve) => {
      resolve();
    });
  },
  verifyEmail(request: { otp: string; userId: string }) {
    return new Promise<void>((resolve) => {
      resolve();
    });
  },
};
