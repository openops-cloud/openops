import { jsonSchema } from '@ai-sdk/ui-utils';
import { ToolSet } from 'ai';
import { AssistantUITools } from './types';

// format tools from assistant-ui to AI SDK ToolSet
export const formatFrontendTools = (tools: AssistantUITools): ToolSet =>
  Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        ...(tool.description ? { description: tool.description } : undefined),
        parameters: jsonSchema(tool.parameters),
      },
    ]),
  );
