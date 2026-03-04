import { BenchmarkWorkflowBase } from '@openops/shared';
import { t } from 'i18next';

export const BenchmarkWorkflowList = ({
  workflows,
  provider,
}: {
  workflows: BenchmarkWorkflowBase[];
  provider: string;
}) => (
  <div className="flex flex-col flex-1 min-h-0">
    <p className="font-medium text-sm mb-2">{t('Available workflows:')}</p>
    <ul className="list-disc pl-5 space-y-1 overflow-y-auto min-h-0">
      {workflows.map((workflow) => (
        <li key={workflow.flowId} className="text-sm">
          {workflow.displayName}
        </li>
      ))}
    </ul>
    <p className="text-xs text-muted-foreground mt-3 italic shrink-0">
      {t(
        '* Running the benchmark triggers {provider} API calls, which may result in a small charge from {provider} (typically not exceeding $0.03 per account).',
        { provider },
      )}
    </p>
  </div>
);

BenchmarkWorkflowList.displayName = 'BenchmarkWorkflowList';
