import axios from 'axios';

import {
  createFederatedResponseInterceptor,
  createResponseInterceptor,
} from './response-interceptor';

let responseInterceptorId: number | null = null;

type InterceptorOptions = {
  isFederatedAuth: boolean;
};

export function setupResponseInterceptor({
  isFederatedAuth,
}: InterceptorOptions): void {
  if (responseInterceptorId === null) {
    const responseInterceptor = isFederatedAuth
      ? createFederatedResponseInterceptor()
      : createResponseInterceptor();
    responseInterceptorId = axios.interceptors.response.use(
      responseInterceptor.onFulfilled,
      responseInterceptor.onRejected,
    );
  }
}
