import { QueryKeys } from '@/app/constants/query-keys';
import { useQuery } from '@tanstack/react-query';
import { flowsApi } from '../../flows/lib/flows-api';
import { stepTestOutputCache } from './data-selector-cache';

export function useSelectorData({
  stepIds,
  flowVersionId,
  useNewExternalTestData,
  isDataSelectorVisible,
  initialLoad,
  setInitialLoad,
  forceRerender,
}: {
  stepIds: string[];
  flowVersionId: string;
  useNewExternalTestData: boolean;
  isDataSelectorVisible: boolean;
  initialLoad: boolean;
  setInitialLoad: (v: boolean) => void;
  forceRerender: (fn: (v: number) => number) => void;
}) {
  const fetchAndCacheStepData = async (ids: string[]) => {
    if (!ids.length) return {};
    const stepTestOutput = await flowsApi.getStepTestOutputBulk(
      flowVersionId,
      ids,
    );
    ids.forEach((id) => {
      if (stepTestOutput[id]) {
        stepTestOutputCache.setStepData(id, stepTestOutput[id]);
      }
    });
    forceRerender((v) => v + 1);
    return stepTestOutput;
  };

  const { isLoading } = useQuery({
    queryKey: [QueryKeys.dataSelectorStepTestOutput, flowVersionId, ...stepIds],
    queryFn: async () => {
      if (!useNewExternalTestData) return {};
      if (initialLoad) {
        setInitialLoad(false);
        return fetchAndCacheStepData(stepIds);
      } else {
        // Only fetch for steps that don't have data in the cache
        const idsToFetch = stepIds.filter(
          (id) => stepTestOutputCache.getStepData(id) === undefined,
        );
        if (idsToFetch.length) {
          return fetchAndCacheStepData(idsToFetch);
        }
        return {};
      }
    },
    enabled:
      !!useNewExternalTestData && isDataSelectorVisible && stepIds.length > 0,
    staleTime: 0,
  });

  return { isLoading };
}
