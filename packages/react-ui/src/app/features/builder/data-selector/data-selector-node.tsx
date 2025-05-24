import { Collapsible, CollapsibleTrigger } from '@openops/components/ui';
import { CollapsibleContent } from '@radix-ui/react-collapsible';
import { memo } from 'react';

import { DataSelectorNodeContent } from './data-selector-node-content';
import { MentionTreeNode } from './data-selector-utils';
import { TestStepSection } from './test-step-section';

type DataSelectoNodeProps = {
  node: MentionTreeNode;
  depth: number;
  searchTerm: string;
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
};

const DataSelectorNode = memo(
  ({
    node,
    depth,
    searchTerm,
    expanded,
    setExpanded,
  }: DataSelectoNodeProps) => {
    if (node.data.isTestStepNode) {
      return (
        <TestStepSection stepName={node.data.propertyPath}></TestStepSection>
      );
    }
    return (
      <Collapsible
        className="w-full"
        open={expanded}
        onOpenChange={setExpanded}
      >
        <>
          <CollapsibleTrigger asChild={true} className="w-full relative">
            <DataSelectorNodeContent
              node={node}
              expanded={expanded}
              setExpanded={setExpanded}
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
                    expanded={expanded}
                    setExpanded={setExpanded}
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
