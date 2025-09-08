export type ToolStepContext = {
  stepName: string;
  actionDescription?: string;
  actionName?: string;
};

export type ToolApprovalType = 'DefaultToolApproval' | 'RiskyStepToolApproval';
