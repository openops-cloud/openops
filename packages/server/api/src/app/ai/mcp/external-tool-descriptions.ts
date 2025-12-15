import { ToolSet } from 'ai';
import { MCP_TOOL_ADDITIONAL_DESCRIPTIONS } from './external-tool-descriptions-data';

export function getAdditionalToolDescriptions(
  tools: ToolSet | string[] | undefined,
): string[] {
  if (!tools) {
    return [];
  }

  const toolNames = Array.isArray(tools) ? tools : Object.keys(tools);
  const descriptions: string[] = [];

  for (const toolName of toolNames) {
    const description = MCP_TOOL_ADDITIONAL_DESCRIPTIONS[toolName];
    if (description?.note) {
      descriptions.push(description.note);
    }
  }

  return descriptions;
}
