import { ToolSet } from 'ai';
import { getSupersetTools } from './superset-tools';
// import { getDocsTools } from './docs-tools';

let toolSet: ToolSet;
export const getMCPTools = async (): Promise<ToolSet> => {
  if (toolSet) {
    return toolSet;
  }

  toolSet = {
    ...(await getSupersetTools()),
    // ...(await getDocsTools()),
  };

  return toolSet;
};
