const createVertexMock = jest.fn();
const createVertexAnthropicMock = jest.fn();

jest.mock('@ai-sdk/google-vertex', () => {
  return {
    createVertex: createVertexMock,
  };
});

jest.mock('@ai-sdk/google-vertex/anthropic', () => {
  return {
    createVertexAnthropic: createVertexAnthropicMock,
  };
});

import { googleVertexProvider } from '../../../src/lib/ai/providers/google-vertex';

const MOCK_SERVICE_ACCOUNT = {
  type: 'service_account',
  project_id: 'test-project',
  private_key_id: 'test-key-id',
  private_key: 'test-private-key',
  client_email: 'test@test-project.iam.gserviceaccount.com',
  client_id: 'test-client-id',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
};

const MOCK_SERVICE_ACCOUNT_JSON = JSON.stringify(MOCK_SERVICE_ACCOUNT);
const MOCK_SERVICE_ACCOUNT_BASE64 = Buffer.from(
  MOCK_SERVICE_ACCOUNT_JSON,
).toString('base64');

describe('googleVertexProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('models', () => {
    test('should include all Gemini models', () => {
      const geminiModels = [
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash-001',
        'gemini-2.0-flash-lite-001',
      ];

      geminiModels.forEach((model) => {
        expect(googleVertexProvider.models).toContain(model);
      });
    });

    test('should include all Claude models', () => {
      const claudeModels = [
        'claude-3-haiku@20240307',
        'claude-3-5-haiku@20241022',
        'claude-3-7-sonnet@20250219',
        'claude-sonnet-4@20250514',
        'claude-opus-4@20250514',
        'claude-opus-4-1@20250805',
      ];

      claudeModels.forEach((model) => {
        expect(googleVertexProvider.models).toContain(model);
      });
    });
  });

  describe('createLanguageModel', () => {
    const mockLanguageModel = jest.fn();

    beforeEach(() => {
      const mockProvider = jest.fn().mockReturnValue(mockLanguageModel);
      createVertexMock.mockReturnValue(mockProvider);
      createVertexAnthropicMock.mockReturnValue(mockProvider);
    });

    test('should create Gemini model using createVertex', () => {
      const params = {
        apiKey: MOCK_SERVICE_ACCOUNT_JSON,
        model: 'gemini-2.5-pro',
        providerSettings: {
          location: 'us-central1',
          project: 'test-project',
        },
      };

      const result = googleVertexProvider.createLanguageModel(params);

      expect(createVertexMock).toHaveBeenCalledWith({
        location: 'us-central1',
        project: 'test-project',
        googleAuthOptions: { credentials: MOCK_SERVICE_ACCOUNT },
      });
      expect(createVertexAnthropicMock).not.toHaveBeenCalled();
      expect(result).toBe(mockLanguageModel);
    });

    test('should create Claude model using createVertexAnthropic', () => {
      const params = {
        apiKey: MOCK_SERVICE_ACCOUNT_JSON,
        model: 'claude-3-5-haiku@20241022',
        providerSettings: {
          location: 'us-central1',
          project: 'test-project',
        },
      };

      const result = googleVertexProvider.createLanguageModel(params);

      expect(createVertexAnthropicMock).toHaveBeenCalledWith({
        location: 'us-central1',
        project: 'test-project',
        googleAuthOptions: { credentials: MOCK_SERVICE_ACCOUNT },
      });
      expect(createVertexMock).not.toHaveBeenCalled();
      expect(result).toBe(mockLanguageModel);
    });

    test('should handle Claude model with uppercase name', () => {
      const params = {
        apiKey: MOCK_SERVICE_ACCOUNT_JSON,
        model: 'CLAUDE-3-5-HAIKU@20241022',
        providerSettings: {
          location: 'us-central1',
          project: 'test-project',
        },
      };

      googleVertexProvider.createLanguageModel(params);

      expect(createVertexAnthropicMock).toHaveBeenCalled();
      expect(createVertexMock).not.toHaveBeenCalled();
    });

    test('should parse base64 encoded service account JSON', () => {
      const params = {
        apiKey: MOCK_SERVICE_ACCOUNT_BASE64,
        model: 'gemini-2.5-pro',
        providerSettings: {
          location: 'us-central1',
          project: 'test-project',
        },
      };

      googleVertexProvider.createLanguageModel(params);

      expect(createVertexMock).toHaveBeenCalledWith({
        location: 'us-central1',
        project: 'test-project',
        googleAuthOptions: { credentials: MOCK_SERVICE_ACCOUNT },
      });
    });

    test('should throw error for invalid JSON in apiKey', () => {
      const params = {
        apiKey: 'invalid-json-string',
        model: 'gemini-2.5-pro',
        providerSettings: {
          location: 'us-central1',
          project: 'test-project',
        },
      };

      expect(() => googleVertexProvider.createLanguageModel(params)).toThrow(
        'Invalid Google Vertex service account JSON provided in apiKey',
      );

      expect(createVertexMock).not.toHaveBeenCalled();
      expect(createVertexAnthropicMock).not.toHaveBeenCalled();
    });

    test('should throw error for invalid base64 that decodes to invalid JSON', () => {
      const invalidBase64 = Buffer.from('invalid-json-content').toString(
        'base64',
      );
      const params = {
        apiKey: invalidBase64,
        model: 'gemini-2.5-pro',
        providerSettings: {
          location: 'us-central1',
          project: 'test-project',
        },
      };

      expect(() => googleVertexProvider.createLanguageModel(params)).toThrow(
        'Invalid Google Vertex service account JSON provided in apiKey',
      );

      expect(createVertexMock).not.toHaveBeenCalled();
      expect(createVertexAnthropicMock).not.toHaveBeenCalled();
    });

    test('should trim whitespace from apiKey before processing', () => {
      const params = {
        apiKey: `  ${MOCK_SERVICE_ACCOUNT_JSON}  `,
        model: 'gemini-2.5-pro',
        providerSettings: {
          location: 'us-central1',
          project: 'test-project',
        },
      };

      googleVertexProvider.createLanguageModel(params);

      expect(createVertexMock).toHaveBeenCalledWith({
        location: 'us-central1',
        project: 'test-project',
        googleAuthOptions: { credentials: MOCK_SERVICE_ACCOUNT },
      });
    });
  });
});
