import { oauthConfig } from '../../../../src/app/oauth/config/oauth-config';
import {
  getRegisteredResources,
  getSupportedScopes,
  resolveResource,
} from '../../../../src/app/oauth/discovery/resource-registry';

const API_URI = 'https://ops.example.com/api';
const MCP_URI = 'https://ops.example.com/mcp';

describe('resource-registry', () => {
  beforeEach(() => {
    jest.spyOn(oauthConfig, 'getApiAudience').mockReturnValue(API_URI);
    jest.spyOn(oauthConfig, 'getMcpResourceUrl').mockReturnValue(MCP_URI);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers the api and mcp resources with their audiences and scopes', () => {
    expect(getRegisteredResources()).toEqual([
      {
        id: 'api',
        audience: API_URI,
        canonicalUri: API_URI,
        scopes: ['api'],
      },
      {
        id: 'mcp',
        audience: MCP_URI,
        canonicalUri: MCP_URI,
        scopes: ['mcp'],
      },
    ]);
  });

  it('omits the mcp resource when no mcp url is configured', () => {
    jest.spyOn(oauthConfig, 'getMcpResourceUrl').mockReturnValue(undefined);

    expect(getRegisteredResources().map((r) => r.id)).toEqual(['api']);
    expect(resolveResource(MCP_URI)).toBeUndefined();
  });

  it('resolves a resource by canonical uri, tolerating a trailing slash', () => {
    expect(resolveResource(MCP_URI)?.id).toBe('mcp');
    expect(resolveResource(`${MCP_URI}/`)?.id).toBe('mcp');
    expect(resolveResource(API_URI)?.id).toBe('api');
  });

  it('does not resolve unknown or empty resources', () => {
    expect(resolveResource('https://elsewhere.example.com')).toBeUndefined();
    expect(resolveResource('')).toBeUndefined();
    expect(resolveResource(`${MCP_URI}/extra`)).toBeUndefined();
  });

  it('lists every supported scope', () => {
    expect(getSupportedScopes()).toEqual(['api', 'mcp']);
  });
});
