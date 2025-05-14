import { ToolSet } from 'ai';
import { getSupersetTools } from './superset-tools';

let toolSet: ToolSet;

export const getMCPTools = async (): Promise<ToolSet> => {
  if (toolSet) {
    return toolSet;
  }

  toolSet = {
    ...(await getSupersetTools()),
  };

  return toolSet;
};
