import { logger } from '@openops/server-shared';
import { ToolSet } from 'ai';
import { getDocsTools } from './docs-tools';
import { getSupersetTools } from './superset-tools';

let toolSet: ToolSet | undefined;

export const getMCPTools = async (): Promise<ToolSet> => {
  if (toolSet) {
    return toolSet;
  }

  const supersetTools = await safeGetTools('superset', getSupersetTools);
  const docsTools = await safeGetTools('docs', getDocsTools);

  toolSet = {
    ...supersetTools,
    ...docsTools,
  } as ToolSet;

  return toolSet;
};

async function safeGetTools(
  name: string,
  loader: () => Promise<ToolSet>,
): Promise<Partial<ToolSet>> {
  try {
    const tools = await loader();
    logger.debug(`Loaded tools for ${name}:`, tools);
    return tools;
  } catch (error) {
    logger.error(`Error loading tools for ${name}:`, error);
    return {};
  }
}
