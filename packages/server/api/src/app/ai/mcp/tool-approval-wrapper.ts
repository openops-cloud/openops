import { ToolSet } from 'ai';

export function wrapToolsWithApproval(
  tools: ToolSet,
  _: (toolName: string) => void,
): ToolSet {
  return tools;
}
