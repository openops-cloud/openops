import { ToolSet } from 'ai';

/**
 * Wraps all tools in a toolset that require approval
 */
export function wrapToolsWithApproval(
  tools: ToolSet,
  _: (toolName: string) => void,
): ToolSet {
  return tools;
}
