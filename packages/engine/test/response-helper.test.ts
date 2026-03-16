import { parseJsonResponse } from '../src/lib/helper/response-helper';
import { logger } from '@openops/server-shared';
import { InfrastructureError } from '../src/lib/helper/execution-errors';

jest.mock('@openops/server-shared', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

describe('parseJsonResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return parsed JSON for a valid JSON response', async () => {
    const payload = { id: 1, name: 'test' };
    const response = {
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: jest.fn().mockResolvedValue(JSON.stringify(payload)),
    } as unknown as Response;

    const result = await parseJsonResponse(response);
    expect(result).toEqual(payload);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should attempt to parse JSON when content-type header is missing', async () => {
    const payload = { id: 2 };
    const response = {
      status: 200,
      headers: new Headers(),
      text: jest.fn().mockResolvedValue(JSON.stringify(payload)),
    } as unknown as Response;

    const result = await parseJsonResponse(response);
    expect(result).toEqual(payload);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should include full status code and full body in InfrastructureError for non-json content-type', async () => {
    const response = {
      status: 502,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: jest.fn().mockResolvedValue('<html><body><h1>502 Bad Gateway</h1><p>Nginx Error</p></body></html>'),
    } as unknown as Response;

    const promise = parseJsonResponse(response);
    await expect(promise).rejects.toThrow(InfrastructureError);
    await expect(promise).rejects.toThrow(
      'Expected JSON response, but received status 502 and text/html. Body: <html><body><h1>502 Bad Gateway</h1><p>Nginx Error</p></body></html>',
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Expected JSON response, but received status 502 and text/html. Body: <html><body><h1>502 Bad Gateway</h1><p>Nginx Error</p></body></html>',
    );
  });

  it('should include status code in InfrastructureError for invalid json', async () => {
    const response = {
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: jest.fn().mockResolvedValue('invalid json'),
    } as unknown as Response;

    const promise = parseJsonResponse(response);
    await expect(promise).rejects.toThrow(InfrastructureError);
    await expect(promise).rejects.toThrow(
      'Failed to parse JSON response with status 200. Body: invalid json',
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to parse JSON response with status 200. Body: invalid json',
    );
  });
});
