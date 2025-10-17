import { ToolSet } from 'ai';

export function wrapToolsWithApproval(tools: ToolSet, _: () => void): ToolSet {
  return tools;
}
