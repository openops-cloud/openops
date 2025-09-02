import { DataTable, PaginationParams } from '@openops/components/ui';
import { FlowRunStatus, FlowRunTriggerSource } from '@openops/shared';
import { t } from 'i18next';
import { CheckIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { RunTypeContent } from '@/app/features/flow-runs/components/run-type';
import { useRunsTableColumns } from '@/app/features/flow-runs/hooks/useRunsTableColumns';
import { flowRunUtils } from '@/app/features/flow-runs/lib/flow-run-utils';
import { flowRunsApi } from '@/app/features/flow-runs/lib/flow-runs-api';
import { flowsHooks } from '@/app/features/flows/lib/flows-hooks';
import { formatUtils } from '@/app/lib/utils';

const fetchData = async (
  params: {
    flowId: string[];
    triggerSource: FlowRunTriggerSource[];
    status: FlowRunStatus[];
    created: string;
  },
  pagination: PaginationParams,
) => {
  const status = params.status;
  return flowRunsApi.list({
    status,
    flowId: params.flowId,
    triggerSource: params.triggerSource,
    cursor: pagination.cursor,
    limit: pagination.limit ?? 10,
    createdAfter: pagination.createdAfter,
    createdBefore: pagination.createdBefore,
  });
};

const FlowRunsPage = () => {
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(false);
  const { data, isFetching } = flowsHooks.useFlows({
    limit: 1000,
    cursor: undefined,
  });

  const flows = data?.data;

  const columns = useRunsTableColumns();

  const filters = useMemo(
    () => [
      {
        type: 'select',
        title: t('Workflow name'),
        accessorKey: 'flowId',
        options:
          flows?.map((flow) => ({
            label: flow.version.displayName,
            value: flow.id,
          })) || [],
        icon: CheckIcon,
      } as const,
      {
        type: 'select',
        title: t('Status'),
        accessorKey: 'status',
        options: Object.values(FlowRunStatus)
          .filter((status) => status !== FlowRunStatus.ABORTED)
          .map((status) => {
            return {
              label: formatUtils.convertEnumToHumanReadable(status),
              value: status,
              icon: flowRunUtils.getStatusIcon(status).Icon,
            };
          }),
        icon: CheckIcon,
      } as const,
      {
        type: 'date',
        title: t('Created'),
        accessorKey: 'created',
        options: [],
        icon: CheckIcon,
      } as const,
      {
        type: 'select',
        title: t('Type'),
        accessorKey: 'triggerSource',
        options: Object.entries(RunTypeContent).map(([key, value]) => {
          return {
            label: value.text,
            value: key,
            icon: value.Icon,
          };
        }),
        icon: CheckIcon,
      } as const,
    ],
    [flows],
  );

  useEffect(() => {
    if (!isFetching) {
      setRefresh((prev) => !prev);
    }
  }, [isFetching]);

  return (
    <div className="flex-col w-full">
      <div className="px-7 mt-1">
        <DataTable
          columns={columns}
          fetchData={fetchData}
          filters={filters}
          refresh={refresh}
          onRowClick={(row, e) => {
            if (e.ctrlKey) {
              window.open(`/runs/${row.id}`, '_blank');
            } else {
              navigate(`/runs/${row.id}`);
            }
          }}
        />
      </div>
    </div>
  );
};

FlowRunsPage.displayName = 'FlowRunsTable';
export { FlowRunsPage };
