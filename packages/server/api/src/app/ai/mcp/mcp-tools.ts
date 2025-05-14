import { ToolSet } from 'ai';
import { getSupersetTools } from './superset-tools';
import { getDocsTools } from './docs-tools';

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
  loader: () => Promise<ToolSet>
): Promise<Partial<ToolSet>> {
  try {
    return await loader();
  } catch (error) {
    console.error('Error loading tools:', error);
    return {};
  }
}
