import { logger } from '@openops/server-shared';
import { ToolExecutionOptions } from 'ai';
import { getMCPTool } from './mcp-tools';

const MCP_TIMEOUT_MS = 10000; // 10 seconds

export async function callMcpTool(
  toolName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
  options: ToolExecutionOptions = {
    toolCallId: '',
    messages: [],
  },
  timeoutMs = MCP_TIMEOUT_MS,
): Promise<
  { success: true; result: unknown } | { success: false; error: Error }
> {
  try {
    const tool = getMCPTool(toolName);

    if (!tool || typeof tool.execute !== 'function') {
      throw new Error(
        `Tool "${toolName}" not found or does not have an execute method.`,
      );
    }

    const result = await withTimeout(
      Promise.resolve(tool.execute(params, options)),
      timeoutMs,
    );
    return { success: true, result };
  } catch (error) {
    logger.error(error, `Error calling MCP tool ${toolName}`);
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
