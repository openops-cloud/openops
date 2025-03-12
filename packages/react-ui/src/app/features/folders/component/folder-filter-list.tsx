import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  SearchInput,
  TooltipProvider,
} from '@openops/components/ui';
import { t } from 'i18next';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCallback, useState } from 'react';

import { flowsHooks } from '@/app/features/flows/lib/flows-hooks';
import { useUpdateSearchParams } from '../hooks/update-search-params';
import { AddNewFolderDialog } from './add-new-folder-dialog';
import { FlowsTreeView } from './flows-tree-view';

const PAGINATION_LIMIT = 100;

const FolderFilterList = () => {
  const [collapsed, setCollapsed] = useState(false);

  const { searchState, setSearchTerm } =
    flowsHooks.useFlowSearch(PAGINATION_LIMIT);

  const onSearchInputChange = useCallback(
    (value: string) => {
      setSearchTerm(value ? value : '');
    },
    [setSearchTerm],
  );

  const updateSearchParams = useUpdateSearchParams();

  return (
    <div className="py-2">
      <Collapsible
        className="w-full"
        open={!collapsed}
        onOpenChange={() => {
          setCollapsed(!collapsed);
        }}
      >
        <>
          <div className="flex flex-row items-center py-1 px-6 h-9">
            <CollapsibleTrigger
              asChild={true}
              className="relative"
              aria-expanded={!collapsed}
            >
              <span className="flex items-center gap-1 font-bold cursor-pointer text-primary-300 dark:text-primary">
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <div className="ml-1 text-sm">{t('Workflows')}</div>
              </span>
            </CollapsibleTrigger>
            <div className="grow"></div>
            {!collapsed && (
              <AddNewFolderDialog updateSearchParams={updateSearchParams} />
            )}
          </div>

          <CollapsibleContent className="flex flex-col w-full max-h-max overflow-hidden data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
            <div className="py-1 px-6">
              <SearchInput
                initialValue={''}
                onChange={onSearchInputChange}
                debounceDelay={300}
              />
            </div>
            <div className="flex w-full h-full flex-col space-y-1">
              <div className="flex flex-col w-full max-h-max">
                <TooltipProvider>
                  <FlowsTreeView flowsSearchState={searchState} />
                </TooltipProvider>
              </div>
            </div>
          </CollapsibleContent>
        </>
      </Collapsible>
    </div>
  );
};

export { FolderFilterList };
