import { t } from 'i18next';
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Diamond,
  Workflow,
} from 'lucide-react';
import { memo, useEffect, useMemo, useRef } from 'react';

import { flattenTree, TreeView, TreeViewItem } from '../../ui/tree-view';
import { SidebarHeader } from '../builder-sidebar/sidebar-header';

import { ActionType, TriggerType } from '@openops/shared';
import { TreeViewAction } from 'react-accessible-treeview';
import LoopIcon from '../../icons/loop-icon';
import SwitchIcon from '../../icons/switch-icon';
import TriggerIcon from '../../icons/trigger-icon';
import { cn } from '../../lib/cn';
import { Button } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { useBuilderTreeViewContext } from './builder-tree-view-context';
import { type TreeNode } from './types';
import {
  getExpandableNodeIds,
  getNodeAndDescendants,
  getNodeAndParents,
  RootNodeId,
} from './utils';

export type BuilderTreeViewProps = {
  treeNode: TreeNode;
  onSelect: (focusNodeId: string, selectNodeId: string) => void;
  onClose: () => void;
};

const BuilderTreeView = memo(
  ({ onSelect, onClose, treeNode }: BuilderTreeViewProps) => {
    const data = useMemo(() => flattenTree(treeNode), [treeNode]);
    const expandableNodeIds = useMemo(() => {
      return getExpandableNodeIds(data);
    }, [data]);

    const { selectedId, expandedIds, setExpandedIds } =
      useBuilderTreeViewContext();
    const treeDispatch = useRef<React.Dispatch<TreeViewAction> | null>(null);

    useEffect(() => {
      if (selectedId && treeDispatch.current) {
        const dispatch = treeDispatch.current;
        const nodesToExpand = getExpandableNodeIds(
          getNodeAndParents(data, selectedId),
        );

        dispatch({
          type: 'EXPAND_MANY',
          ids: nodesToExpand,
        });

        setTimeout(() => {
          const scrollToElement = document.querySelector(
            `#builder-tree-view #${selectedId}`,
          );
          if (scrollToElement) {
            scrollToElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
        }, 100);
      }
    }, [selectedId]);

    const highlightedNodesIds = getNodeAndDescendants(
      data,
      selectedId as string,
    ).map((n) => n.id);

    const handleExpandAll = () => {
      if (treeDispatch.current && expandableNodeIds) {
        const dispatch = treeDispatch.current;

        dispatch({
          type: 'EXPAND_MANY',
          ids: expandableNodeIds,
        });
      }
    };

    const handleCollapseAll = () => {
      if (treeDispatch.current) {
        const dispatch = treeDispatch.current;

        dispatch({
          type: 'COLLAPSE_MANY',
          ids: expandedIds,
        });
      }
    };

    const handleToggleAll = () => {
      expandedIds.length === expandableNodeIds.length
        ? handleCollapseAll()
        : handleExpandAll();
    };

    return (
      <>
        <SidebarHeader
          onClose={onClose}
          className="p-2 border-b text-primary-300 dark:text-primary h-[61px]"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2 items-center">
              <Workflow className="w-6 h-6 m-2" />
              <span className="font-bold"> {t('Tree View')}</span>
            </div>
            {!!expandableNodeIds.length && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghostActive"
                    onClick={handleToggleAll}
                    className="px-1 mr-1"
                    size="xs"
                    data-testid="toggleAllTreeViewItemsButton"
                  >
                    {expandedIds.length === expandableNodeIds.length ? (
                      <ChevronsDownUp
                        className="size-4 text-foreground"
                        data-testid="collapseAllTreeViewButton"
                      />
                    ) : (
                      <ChevronsUpDown
                        className="size-4 text-foreground"
                        data-testid="expandAllTreeViewButton"
                      />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {expandedIds.length === expandableNodeIds.length
                    ? t('Collapse all')
                    : t('Expand all')}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </SidebarHeader>

        <div className="relative mt-2" id="builder-tree-view">
          <TreeView
            data={data}
            defaultExpandedIds={expandedIds}
            selectedIds={selectedId ? [selectedId] : undefined}
            // @ts-expect-error ts(2322) the prop works, but the TS types exposed by the library don't contain it: https://github.com/dgreene1/react-accessible-treeview/issues/144#issuecomment-2462831881
            onKeyDown={(evt) => {
              evt.stopPropagation();
            }}
            onExpand={({ element, isExpanded }) => {
              if (element.children?.length && element.id !== RootNodeId) {
                if (isExpanded) {
                  setExpandedIds((prevExpandedIds) => {
                    return Array.from(
                      new Set([...prevExpandedIds, element.id]),
                    );
                  });
                } else {
                  setExpandedIds((prevExpandedIds) => {
                    return prevExpandedIds.filter((id) => id !== element.id);
                  });
                }
              }
            }}
            nodeRenderer={({
              element,
              level,
              isSelected,
              getNodeProps,
              handleSelect,
              handleExpand,
              dispatch,
            }) => {
              if (treeDispatch.current === null) {
                treeDispatch.current = dispatch;
              }

              return (
                <TreeViewItem
                  id={element.id.toString()}
                  {...getNodeProps({
                    onClick: (e) => {
                      handleSelect(e);

                      if (element.metadata?.nodeName) {
                        const nodeId = element.metadata.nodeName.toString();
                        onSelect(nodeId, nodeId);
                        return;
                      }

                      const branchNodeRelative =
                        element.children?.[0] ?? element.parent;
                      if (branchNodeRelative) {
                        onSelect(
                          branchNodeRelative.toString(),
                          element.id.toString(),
                        );
                      }
                    },
                  })}
                  name={element.name}
                  onExpand={(e) => {
                    if (element.children?.length && element.id !== RootNodeId) {
                      handleExpand(e);
                      setExpandedIds((prevExpandedIds) => {
                        if (prevExpandedIds.includes(element.id)) {
                          return prevExpandedIds.filter(
                            (id) => id !== element.id,
                          );
                        }
                        return [...prevExpandedIds, element.id];
                      });
                    }
                  }}
                  isExpanded={expandedIds.includes(element.id)}
                  icon={getIcon(element.metadata?.nodeType as string)}
                  xPadding={22}
                  levelPadding={28}
                  level={level}
                  isBranch={element.isBranch}
                  isDefaultBranch={!!element?.metadata?.isDefaultBranch}
                  isSelected={isSelected}
                  isHighlighted={highlightedNodesIds.includes(element.id)}
                  hasChildNodes={element.children.length > 0}
                  contentClassName={cn({
                    'pr-14':
                      (element.metadata?.nodeType === TriggerType.BLOCK ||
                        element.metadata?.nodeType === TriggerType.EMPTY) &&
                      expandableNodeIds.length,
                  })}
                />
              );
            }}
          />
        </div>
      </>
    );
  },
);

const getIcon = (type?: string) => {
  switch (type) {
    case TriggerType.BLOCK:
      return <TriggerIcon className="text-primary-300/60 dark:text-primary" />;
    case TriggerType.EMPTY:
      return <TriggerIcon className="text-primary-300/60 dark:text-primary" />;
    case ActionType.LOOP_ON_ITEMS:
      return <LoopIcon className="text-primary-300/60 dark:text-primary" />;
    case ActionType.SPLIT:
      return <SwitchIcon className="text-primary-300/60 dark:text-primary" />;
    default:
      return (
        <Diamond className="size-[18px] text-primary-300/60 dark:text-primary" />
      );
  }
};

BuilderTreeView.displayName = 'TreeView';
export { BuilderTreeView };
