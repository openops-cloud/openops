import { OPENOPS_CLOUD_USER_INFO_API_URL } from '@/app/constants/cloud';
import { authenticationSession } from '@/app/lib/authentication-session';
import { AxiosError, AxiosResponse, HttpStatusCode } from 'axios';

export function createResponseInterceptor(): {
  onFulfilled: (response: AxiosResponse) => AxiosResponse;
  onRejected: (error: AxiosError) => Promise<never>;
} {
  return {
    onFulfilled: (response: AxiosResponse): AxiosResponse => response,
    onRejected: (error: AxiosError): Promise<never> => {
      if (
        error.response &&
        error.response.status === HttpStatusCode.Unauthorized
      ) {
        const url = error.request?.responseURL;

        let isSignInRoute = false;
        if (url) {
          try {
            const parsedUrl = new URL(url, window.location.origin);
            isSignInRoute =
              parsedUrl.pathname === '/api/v1/authentication/sign-in';
          } catch (e) {
            console.warn('Failed to parse URL in 401 interceptor:', url, e);
            isSignInRoute = false;
          }
        }

        if (url !== OPENOPS_CLOUD_USER_INFO_API_URL && !isSignInRoute) {
          console.warn('JWT expired logging out');

          authenticationSession.logOut({
            userInitiated: false,
          });
          window.location.reload();
        }
      }
      return Promise.reject(error);
    },
  };
}

export function createFederatedResponseInterceptor(): {
  onFulfilled: (response: AxiosResponse) => AxiosResponse;
  onRejected: (error: AxiosError) => Promise<never>;
} {
  throw new Error('Not implemented in OSS');
}
