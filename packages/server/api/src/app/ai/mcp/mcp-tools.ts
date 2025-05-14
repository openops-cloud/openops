import { logger } from '@openops/server-shared';
import { ToolSet } from 'ai';
import { getDocsTools } from './docs-tools';
import { getSupersetTools } from './superset-tools';

let toolSet: ToolSet | undefined;

export const getMCPTools = async (): Promise<ToolSet> => {
  if (toolSet) {
    return toolSet;
  }

  toolSet = {
    ...(await safeGetTools(getSupersetTools)),
    ...(await safeGetTools(getDocsTools)),
  } as ToolSet;

  return toolSet;
};

async function safeGetTools(
  loader: () => Promise<ToolSet>,
): Promise<Partial<ToolSet>> {
  try {
    return await loader();
  } catch (error) {
    logger.error('Error loading tools:', error);
    return {};
  }
}
