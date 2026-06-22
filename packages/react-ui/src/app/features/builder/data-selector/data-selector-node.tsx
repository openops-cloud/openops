import { Collapsible, CollapsibleTrigger } from '@openops/components/ui';
import { CollapsibleContent } from '@radix-ui/react-collapsible';
import { memo, useCallback, useSyncExternalStore } from 'react';

import { stepTestOutputCache } from './data-selector-cache';
import { DataSelectorNodeContent } from './data-selector-node-content';
import { MentionTreeNode } from './data-selector-utils';
import { TestStepSection } from './test-step-section';

type DataSelectoNodeProps = {
  node: MentionTreeNode;
  depth: number;
  searchTerm: string;
};

const DataSelectorNode = memo(
  ({ node, depth, searchTerm }: DataSelectoNodeProps) => {
    const subscribe = useCallback(
      (callback: () => void) =>
        stepTestOutputCache.subscribe(node.key, callback),
      [node.key],
    );
    const getSnapshot = useCallback(
      () => stepTestOutputCache.getExpanded(node.key),
      [node.key],
    );
    const expanded = useSyncExternalStore(subscribe, getSnapshot);

    const handleSetExpanded = useCallback(
      (newExpanded: boolean) =>
        stepTestOutputCache.setExpanded(node.key, newExpanded),
      [node.key],
    );

    if (node.data.isTestStepNode) {
      return (
        <TestStepSection stepName={node.data.propertyPath}></TestStepSection>
      );
    }

    return (
      <Collapsible
        className="w-full"
        open={expanded}
        onOpenChange={handleSetExpanded}
      >
        <>
          <CollapsibleTrigger asChild={true} className="w-full relative">
            <DataSelectorNodeContent
              node={node}
              expanded={expanded}
              setExpanded={handleSetExpanded}
              depth={depth}
            ></DataSelectorNodeContent>
          </CollapsibleTrigger>
          <CollapsibleContent className="w-full">
            {node.children && node.children.length > 0 && (
              <div className="flex flex-col ">
                {node.children.map((childNode) => (
                  <DataSelectorNode
                    depth={depth + 1}
                    node={childNode}
                    key={childNode.key}
                    searchTerm={searchTerm}
                  ></DataSelectorNode>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </>
      </Collapsible>
    );
  },
);

DataSelectorNode.displayName = 'DataSelectorNode';
export { DataSelectorNode };
