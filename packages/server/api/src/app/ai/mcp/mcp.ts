import { ToolExecutionOptions } from 'ai';
import { getMCPTool } from './mcp-tools';

export async function callMcpTool(
  toolName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
  options: ToolExecutionOptions = {
    toolCallId: '',
    messages: [],
  },
): Promise<unknown> {
  const tool = getMCPTool(toolName);
  return tool.execute?.(params, options);
}
