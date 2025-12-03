import { MCP_TOOL_ADDITIONAL_DESCRIPTIONS } from './external-tool-descriptions-data';

export function getToolAdditionalDescription(
  toolName: string,
): string | undefined {
  return MCP_TOOL_ADDITIONAL_DESCRIPTIONS[toolName];
}

export function getAdditionalDescriptionsForSelectedTools(
  selectedTools: Record<string, unknown> | undefined,
): string[] {
  if (!selectedTools) {
    return [];
  }

  const descriptions: string[] = [];
  for (const toolName of Object.keys(selectedTools)) {
    const description = getToolAdditionalDescription(toolName);
    if (description) {
      descriptions.push(description);
    }
  }

  return descriptions;
}
