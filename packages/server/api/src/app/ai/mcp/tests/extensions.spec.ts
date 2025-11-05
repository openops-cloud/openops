import { LanguageModel, ModelMessage, ToolSet } from 'ai';
import {
  beforeToolRouting,
  enhanceSystemPrompt,
  getAdditionalQueryClassificationDescriptions,
  getAdditionalTools,
  processTools,
} from '../extensions';
import { QueryClassification } from '../types';

describe('Extension Points (Open Source)', () => {
  const mockContext = {
    userId: 'test-user',
    chatId: 'test-chat',
    projectId: 'test-project',
  };

  describe('getAdditionalQueryClassificationDescriptions', () => {
    it('should return empty object in base implementation', () => {
      const result = getAdditionalQueryClassificationDescriptions();
      expect(result).toEqual({});
    });
  });

  describe('getAdditionalTools', () => {
    it('should return empty toolset in base implementation', async () => {
      const result = await getAdditionalTools({
        queryClassification: [QueryClassification.general],
        tools: {},
        languageModel: {} as LanguageModel,
        context: mockContext,
      });
      expect(result).toEqual({});
    });

    it('should return empty toolset for any classification', async () => {
      const result = await getAdditionalTools({
        queryClassification: [
          QueryClassification.openops,
          QueryClassification.analytics,
        ],
        tools: { existingTool: { description: 'test' } },
        languageModel: {} as LanguageModel,
        context: mockContext,
      });
      expect(result).toEqual({});
    });
  });

  describe('enhanceSystemPrompt', () => {
    it('should return unchanged prompt in base implementation', async () => {
      const basePrompt = 'This is a test prompt';
      const result = await enhanceSystemPrompt({
        basePrompt,
        queryClassification: [QueryClassification.general],
        hasTools: true,
        context: mockContext,
      });
      expect(result).toBe(basePrompt);
    });

    it('should not modify prompt regardless of parameters', async () => {
      const basePrompt = 'Another test prompt';
      const result = await enhanceSystemPrompt({
        basePrompt,
        queryClassification: [QueryClassification.openops],
        hasTools: false,
        context: mockContext,
      });
      expect(result).toBe(basePrompt);
    });
  });

  describe('processTools', () => {
    it('should return tools unchanged in base implementation', async () => {
      const tools: ToolSet = {
        tool1: { description: 'Tool 1' },
        tool2: { description: 'Tool 2' },
      };
      const selectedToolNames = ['tool1', 'tool2'];

      const result = await processTools({
        tools,
        selectedToolNames,
        queryClassification: [QueryClassification.general],
        context: mockContext,
      });

      expect(result.tools).toBe(tools);
      expect(result.selectedToolNames).toBe(selectedToolNames);
    });
  });

  describe('beforeToolRouting', () => {
    it('should complete without errors in base implementation', async () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'test message' },
      ];

      await expect(
        beforeToolRouting({ messages, context: mockContext }),
      ).resolves.toBeUndefined();
    });

    it('should be a no-op for any input', async () => {
      const messages: ModelMessage[] = [
        { role: 'user', content: 'complex message' },
        { role: 'assistant', content: 'response' },
      ];

      const result = await beforeToolRouting({
        messages,
        context: mockContext,
      });
      expect(result).toBeUndefined();
    });
  });

  describe('Extension Point Integration', () => {
    it('should allow all extension points to be called in sequence', async () => {
      // Simulate the flow in tools-context-builder
      const messages: ModelMessage[] = [
        { role: 'user', content: 'test query' },
      ];
      const tools: ToolSet = { baseTool: { description: 'base' } };
      const selectedToolNames = ['baseTool'];
      const basePrompt = 'System prompt';

      // Step 1: beforeToolRouting
      await beforeToolRouting({ messages, context: mockContext });

      // Step 2: getAdditionalTools
      const additionalTools = await getAdditionalTools({
        queryClassification: [QueryClassification.general],
        tools,
        languageModel: {} as LanguageModel,
        context: mockContext,
      });

      const combinedTools = { ...tools, ...additionalTools };

      // Step 3: processTools
      const { tools: processedTools, selectedToolNames: finalToolNames } =
        await processTools({
          tools: combinedTools,
          selectedToolNames: [
            ...selectedToolNames,
            ...Object.keys(additionalTools),
          ],
          queryClassification: [QueryClassification.general],
          context: mockContext,
        });

      // Step 4: enhanceSystemPrompt
      const finalPrompt = await enhanceSystemPrompt({
        basePrompt,
        queryClassification: [QueryClassification.general],
        hasTools: Object.keys(processedTools).length > 0,
        context: mockContext,
      });

      // Verify base implementation behavior
      expect(Object.keys(additionalTools)).toHaveLength(0);
      expect(processedTools).toEqual(combinedTools);
      expect(finalToolNames).toEqual(selectedToolNames);
      expect(finalPrompt).toBe(basePrompt);
    });
  });
});
