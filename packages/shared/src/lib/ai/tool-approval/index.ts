export type ToolStepContext = {
  stepName: string;
  actionDescription?: string;
  actionName?: string;
};

export type ToolApprovalType = 'DefaultToolApproval' | 'RiskyStepToolApproval';

export const APPROVAL_TOOL_NAME = 'backend_tool_approval';
