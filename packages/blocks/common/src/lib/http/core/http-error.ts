import { AxiosError } from 'axios';
import { getAzureRetryDelayMs } from './azure-retry-delay';
import { HttpHeaders } from './http-headers';

export class HttpError extends Error {
  constructor(
    private readonly _requestBody: unknown,
    private readonly _err: AxiosError,
  ) {
    super(
      JSON.stringify({
        response: {
          status: _err?.response?.status || 500,
          body: _err?.response?.data,
        },
        request: {
          body: _requestBody,
        },
      }),
    );
  }

  public errorMessage() {
    return {
      response: {
        status: this._err?.response?.status || 500,
        body: this._err?.response?.data,
      },
      request: {
        body: this._requestBody,
      },
    };
  }

  get response() {
    return {
      status: this._err?.response?.status || 500,
      headers: (this._err?.response?.headers as HttpHeaders | undefined) ?? {},
      body: this._err?.response?.data,
    };
  }

  get retryAfterMs(): number | undefined {
    if (this.response.status !== 429) {
      return undefined;
    }

    return getAzureRetryDelayMs(this.response.headers);
  }

  get request() {
    return {
      body: this._requestBody,
    };
  }
}
