import axios from 'axios';

import {
  createFederatedResponseInterceptor,
  createResponseInterceptor,
} from './response-interceptor';

let responseInterceptorId: number | null = null;

type ResponseInterceptorOptions = {
  isFederatedAuth: boolean;
};

export function setupResponseInterceptor({
  isFederatedAuth,
}: ResponseInterceptorOptions): void {
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
