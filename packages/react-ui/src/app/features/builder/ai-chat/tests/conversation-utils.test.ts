import { UIMessage } from '@ai-sdk/ui-utils'; // Fix this
import { AIChatMessageRole, tryParseJson } from '@openops/components/ui';
import { CodeSchema } from '@openops/shared';
import {
  createCodeMessage,
  createMessage,
  extractCodeFromContent,
  getMessageId,
  isCodeMessage,
  MessageType,
  ServerMessage,
} from '../conversation-utils';

jest.mock('@openops/components/ui', () => ({
  ...jest.requireActual('@openops/components/ui'),
  tryParseJson: jest.fn(),
}));

const mockTryParseJson = tryParseJson as jest.MockedFunction<
  typeof tryParseJson
>;

describe('conversation-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isCodeMessage', () => {
    const mockCodeSchema: CodeSchema = {
      type: 'code',
      code: 'console.log("test");',
      packageJson: '{}',
      textAnswer: 'Test code',
    };

    it.each([
      {
        description: 'should return true for UIMessage with code annotation',
        message: {
          id: '1',
          role: 'assistant',
          content: { parts: [] },
          annotations: [mockCodeSchema],
        } as unknown as UIMessage,
        expected: true,
      },
      {
        description: 'should return false for UIMessage without annotations',
        message: {
          id: '1',
          role: 'assistant',
          content: { parts: [] },
        } as unknown as UIMessage,
        expected: false,
      },
      {
        description: 'should return false for UIMessage with empty annotations',
        message: {
          id: '1',
          role: 'assistant',
          content: { parts: [] },
          annotations: [],
        } as unknown as UIMessage,
        expected: false,
      },
    ])('$description', ({ message, expected }) => {
      const result = isCodeMessage(message);
      expect(result).toBe(expected);
    });

    it('should return true for string content containing code schema', () => {
      const message: ServerMessage = {
        role: 'assistant',
        content: '{"type": "code", "code": "test"}',
      };

      mockTryParseJson.mockReturnValue(mockCodeSchema);

      const result = isCodeMessage(message);
      expect(result).toBe(true);
      expect(mockTryParseJson).toHaveBeenCalledWith(
        '{"type": "code", "code": "test"}',
      );
    });

    it('should return true for array content containing code schema', () => {
      const message: ServerMessage = {
        role: 'assistant',
        content: [{ type: 'text', text: '{"type": "code", "code": "test"}' }],
      };

      mockTryParseJson.mockReturnValue(mockCodeSchema);

      const result = isCodeMessage(message);
      expect(result).toBe(true);
    });

    it('should return false for array content without text items', () => {
      const message: ServerMessage = {
        role: 'assistant',
        content: [{ type: 'image', data: 'base64data' }] as any,
      };

      const result = isCodeMessage(message);
      expect(result).toBe(false);
    });

    it('should return false when tryParseJson returns non-code schema', () => {
      const message: ServerMessage = {
        role: 'assistant',
        content: '{"type": "reply", "textAnswer": "test"}',
      };

      mockTryParseJson.mockReturnValue({ type: 'reply', textAnswer: 'test' });

      const result = isCodeMessage(message);
      expect(result).toBe(false);
    });

    it('should return false for string content that is not code', () => {
      const message: ServerMessage = {
        role: 'assistant',
        content: 'plain text',
      };

      mockTryParseJson.mockReturnValue(null);

      const result = isCodeMessage(message);
      expect(result).toBe(false);
    });
  });

  describe('extractCodeFromContent', () => {
    const mockCodeSchema: CodeSchema = {
      type: 'code',
      code: 'console.log("test");',
      packageJson: '{"name": "test"}',
      textAnswer: 'Test code explanation',
    };

    it('should extract code from UIMessage annotations', () => {
      const message: UIMessage = {
        id: '1',
        role: 'assistant',
        content: { parts: [] },
        annotations: [mockCodeSchema],
      } as unknown as UIMessage;

      const result = extractCodeFromContent(message);
      expect(result).toEqual(mockCodeSchema);
    });

    it('should extract code from string content', () => {
      const message: ServerMessage = {
        role: 'assistant',
        content: '{"type": "code", "code": "test"}',
      };

      mockTryParseJson.mockReturnValue(mockCodeSchema);

      const result = extractCodeFromContent(message);
      expect(result).toEqual(mockCodeSchema);
      expect(mockTryParseJson).toHaveBeenCalledWith(
        '{"type": "code", "code": "test"}',
      );
    });

    it('should extract code from array content', () => {
      const message: ServerMessage = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'some text' },
          { type: 'text', text: '{"type": "code", "code": "test"}' },
        ],
      };

      mockTryParseJson
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(mockCodeSchema);

      const result = extractCodeFromContent(message);
      expect(result).toEqual(mockCodeSchema);
    });

    it.each([
      {
        description: 'should return null when no code schema found',
        message: {
          role: 'assistant',
          content: 'plain text',
        } as ServerMessage,
        mockReturn: null,
      },
      {
        description: 'should return null for non-text array items',
        message: {
          role: 'assistant',
          content: [{ type: 'image', data: 'base64' }] as any,
        } as ServerMessage,
        mockReturn: null,
      },
    ])('$description', ({ message, mockReturn }) => {
      mockTryParseJson.mockReturnValue(mockReturn);
      const result = extractCodeFromContent(message);
      expect(result).toBeNull();
    });
  });

  describe('getMessageId', () => {
    it.each([
      {
        description: 'should return message id when present',
        message: {
          id: 'msg-123',
          role: 'assistant',
          content: { parts: [] },
        } as unknown as UIMessage,
        idx: 5,
        expected: 'msg-123',
      },
      {
        description: 'should return string index when message has no id',
        message: { role: 'user', content: 'test' } as ServerMessage,
        idx: 42,
        expected: '42',
      },
    ])('$description', ({ message, idx, expected }) => {
      const result = getMessageId(message, idx);
      expect(result).toBe(expected);
    });
  });

  describe('createCodeMessage', () => {
    const mockCodeSchema: CodeSchema = {
      type: 'code',
      code: 'console.log("hello");',
      packageJson: '{"name": "test"}',
      textAnswer: 'This is a test',
    };

    it('should create code message with correct structure', () => {
      const message: ServerMessage = {
        role: 'assistant',
        content: 'test',
      };

      // Mock the message to have an id for this test
      const messageWithId = { ...message, id: 'msg-1' } as MessageType;

      const result = createCodeMessage(messageWithId, 0, mockCodeSchema);

      expect(result).toEqual({
        id: 'msg-1',
        role: AIChatMessageRole.assistant,
        content: {
          parts: [
            {
              type: 'sourcecode',
              content: {
                code: 'console.log("hello");',
                packageJson: '{"name": "test"}',
              },
            },
            {
              type: 'text',
              content: 'This is a test',
            },
          ],
        },
      });
    });

    it('should fall back to createMessage when parsed type is not code', () => {
      const message: ServerMessage = {
        role: 'assistant',
        content: 'test content',
      };

      const messageWithId = { ...message, id: 'msg-1' } as MessageType;

      const nonCodeSchema = {
        type: 'reply',
        textAnswer: 'test',
      } as any;

      const result = createCodeMessage(messageWithId, 0, nonCodeSchema);

      expect(result).toEqual({
        id: 'msg-1',
        role: AIChatMessageRole.assistant,
        content: 'test content',
      });
    });
  });

  describe('createMessage', () => {
    it.each([
      {
        description: 'should create user message',
        message: {
          role: 'user',
          content: 'Hello world',
        } as ServerMessage,
        expected: {
          id: '0',
          role: AIChatMessageRole.user,
          content: 'Hello world',
        },
      },
      {
        description: 'should create assistant message',
        message: {
          role: 'assistant',
          content: 'Hi there',
        } as ServerMessage,
        expected: {
          id: '0',
          role: AIChatMessageRole.assistant,
          content: 'Hi there',
        },
      },
    ])('$description', ({ message, expected }) => {
      const result = createMessage(message, 0);
      expect(result).toEqual(expected);
    });

    it('should handle array content with reply message', () => {
      const message: ServerMessage = {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: '{"type": "reply", "textAnswer": "Extracted text"}',
          },
        ],
      };

      mockTryParseJson.mockReturnValue({
        type: 'reply',
        textAnswer: 'Extracted text',
      });

      const result = createMessage(message, 0);

      expect(result.content).toBe('Extracted text');
    });

    it('should handle array content without reply message', () => {
      const message: ServerMessage = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'first' },
          { type: 'text', text: 'second' },
        ],
      };

      mockTryParseJson.mockReturnValue(null);

      const result = createMessage(message, 0);

      expect(result.content).toBe('first,second');
    });

    it('should handle string content with reply message', () => {
      const message: ServerMessage = {
        role: 'assistant',
        content: '{"type": "reply", "textAnswer": "Direct text"}',
      };

      mockTryParseJson.mockReturnValue({
        type: 'reply',
        textAnswer: 'Direct text',
      });

      const result = createMessage(message, 0);

      expect(result.content).toBe('Direct text');
    });

    it('should use index as id when message has no id', () => {
      const message: ServerMessage = {
        role: 'user',
        content: 'test',
      };

      const result = createMessage(message, 5);

      expect(result.id).toBe('5');
    });

    it('should handle case-insensitive role matching', () => {
      const message: ServerMessage = {
        role: 'USER' as any,
        content: 'test',
      };

      const result = createMessage(message, 0);

      expect(result.role).toBe(AIChatMessageRole.user);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null/undefined content gracefully', () => {
      const message: ServerMessage = {
        role: 'assistant',
        content: null as any,
      };

      const result = createMessage(message, 0);
      expect(result.content).toBe(null);
    });

    it('should handle empty array content', () => {
      const message: ServerMessage = {
        role: 'assistant',
        content: [],
      };

      const result = createMessage(message, 0);
      expect(result.content).toBe('');
    });

    it('should handle malformed JSON in content', () => {
      const message: ServerMessage = {
        role: 'assistant',
        content: '{"invalid": json}',
      };

      mockTryParseJson.mockReturnValue(null);

      const codeResult = extractCodeFromContent(message);
      expect(codeResult).toBeNull();

      const isCode = isCodeMessage(message);
      expect(isCode).toBe(false);
    });
  });
});
