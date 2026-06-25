import { FlowVersionState, SourceCode } from '@openops/shared';

export type CodeArtifact = {
  name: string;
  sourceCode: SourceCode;
  flowVersionId: string;
  flowRunId: string;
  flowVersionState: FlowVersionState;
};
