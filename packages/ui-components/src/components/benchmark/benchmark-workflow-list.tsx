import { BenchmarkWorkflowBase } from '@openops/shared';
import { t } from 'i18next';

export const BenchmarkWorkflowList = ({
  workflows,
}: {
  workflows: BenchmarkWorkflowBase[];
}) => (
  <div>
    <p className="font-medium text-sm mb-2">{t('Available workflows:')}</p>
    <ul className="list-disc pl-5 space-y-1 overflow-y-auto max-h-[120px]">
      {workflows.map((workflow) => (
        <li key={workflow.flowId} className="text-sm">
          {workflow.displayName}
        </li>
      ))}
    </ul>
    <p className="text-xs text-muted-foreground mt-3 italic">
      {t(
        '* Running the benchmark triggers AWS API calls, which may result in a small charge from AWS (typically not exceeding $0.03 per account).',
      )}
    </p>
  </div>
);

BenchmarkWorkflowList.displayName = 'BenchmarkWorkflowList';
