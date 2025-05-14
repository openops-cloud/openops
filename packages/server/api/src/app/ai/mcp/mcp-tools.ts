import { ToolSet } from 'ai';

// import { getDocsTools } from './docs-tools';

let toolSet: ToolSet;
export const getMCPTools = async (): Promise<ToolSet> => {
  if (toolSet) {
    return toolSet;
  }

  toolSet = {
    // ...(await getDocsTools()),
  };

  return toolSet;
};
