import { logger } from '@openops/server-shared';
import { MCPTool } from './types';

export async function safeGetTools(
  name: string,
  loader: () => Promise<MCPTool>,
): Promise<Partial<MCPTool>> {
  try {
    const mcpTool = await loader();

    logger.debug(`Loaded tools for ${name}:`, {
      keys: Object.keys(mcpTool.toolSet),
    });

    return mcpTool;
  } catch (error) {
    logger.error(`Error loading tools for ${name}:`, { error });
    return {};
  }
}
