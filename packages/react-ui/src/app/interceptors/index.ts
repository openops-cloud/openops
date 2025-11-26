import axios from 'axios';

import { createRequestInterceptor } from './request-interceptor';
import {
  createFederatedResponseInterceptor,
  createResponseInterceptor,
} from './response-interceptor';

let requestInterceptorId: number | null = null;
let responseInterceptorId: number | null = null;

function setupRequestInterceptor(): void {
  if (requestInterceptorId === null) {
    const requestInterceptor = createRequestInterceptor();
    requestInterceptorId = axios.interceptors.request.use(requestInterceptor);
  }
}

setupRequestInterceptor();

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
