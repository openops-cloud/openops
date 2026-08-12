'use client';

import { ChevronDown, ChevronRight, Star } from 'lucide-react';
import { ComponentPropsWithoutRef, forwardRef, ReactNode } from 'react';
import TreeViewPrimitive, { flattenTree } from 'react-accessible-treeview';

import { OverflowTooltip } from '../components/overflow-tooltip';
import { BranchIcon } from '../icons';
import { cn } from '../lib/cn';

const TreeView = TreeViewPrimitive;

const TreeViewItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<'div'> & {
    /** The level of the item in the tree */
    level: number;
    /** Specifies if the item is expanded */
    isExpanded?: boolean;
    /** Specifies if the item has child nodes */
    hasChildNodes: boolean;
    /** Specifies if the item is a branch */
    isBranch?: boolean;
    /** Specifies if the item is a default branch */
    isDefaultBranch?: boolean;
    /** The padding for each level of the item */
    levelPadding?: number;
    /** Specifies if the item is selected */
    isSelected?: boolean;
    /** Specifies if the item is highlighted */
    isHighlighted?: boolean;
    /** The horizontal padding of the item */
    xPadding: number;
    /** Additional styles for tree item content */
    contentClassName?: string;
    /** name of entity */
    name: string;
    /** icon of entity */
    icon?: ReactNode;

    onClick: (e: React.MouseEvent) => void;
    onExpand: (e: React.MouseEvent) => void;
  }
>(
  (
    {
      level = 1,
      levelPadding = 40,
      isExpanded = false,
      isBranch = false,
      isDefaultBranch = false,
      isSelected = false,
      isHighlighted = false,
      xPadding = 24,
      contentClassName,
      name = '',
      icon,
      hasChildNodes,
      onClick,
      onExpand,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        aria-selected={isSelected}
        aria-expanded={isExpanded}
        {...props}
        className={cn(
          'group relative',
          'transition-colors',
          'h-7',
          'flex items-center',
          'text-sm',
          'text-foreground-light',
          'dark:text-primary',
          'hover:bg-muted',
          'aria-expanded:bg-control',
          'data-[state=open]:bg-control',
          'py-[18px]',
          'pr-4',
          {
            'bg-blueAccent-100 dark:bg-blueAccent-100/10': isHighlighted,
          },
          {
            'bg-blue-100 dark:bg-blueAccent-100/40': isSelected,
          },
          {
            'hover:bg-blue-50': isHighlighted,
          },
        )}
        style={{
          paddingLeft:
            level === 1 && !isBranch
              ? xPadding
              : level
                ? levelPadding * (level - 1) + xPadding
                : levelPadding,
          ...props.style,
        }}
        data-treeview-is-branch={isBranch}
        data-treeview-level={level}
      >
        {level && level > 1 && (
          <div
            style={{
              left: (levelPadding / 2 + 2) * (level - 1) + xPadding,
            }}
            className={
              'absolute h-full w-px group-data-[treeview-is-branch=false]:bg-border-strong'
            }
          ></div>
        )}

        <CollapsibleToggle
          onExpand={onExpand}
          isExpanded={isExpanded}
          hasChildNodes={hasChildNodes}
          data-testid="treeViewItemCollapsibleToggle"
        />
        <div
          role="button"
          className={cn(
            'w-[calc(100%-24px)] h-7 flex items-center gap-2 ml-2 cursor-pointer',
            contentClassName,
          )}
          onClick={(e) => {
            onClick(e);
            if (!isExpanded) {
              onExpand(e);
            }
          }}
        >
          {isBranch ? (
            <BranchIcon className="text-primary-300/60 dark:text-primary" />
          ) : (
            icon
          )}
          <div className="flex items-center flex-1 gap-2 truncate w-[calc(100%-24px)]">
            <OverflowTooltip text={name} tooltipPlacement="bottom">
              {(ref) => (
                <span
                  ref={ref}
                  style={{ maxWidth: '100%' }}
                  className={cn(
                    'truncate text-sm cursor-pointer select-none text-primary-300 dark:text-primary',
                    {
                      'max-w-[calc(100%-24px)]': isDefaultBranch,
                    },
                  )}
                >
                  {name}
                </span>
              )}
            </OverflowTooltip>
            {isDefaultBranch && (
              <Star
                className="w-4 h-4 text-gray-400 dark:text-primary flex-shrink-0"
                fill="currentColor"
              />
            )}
          </div>
        </div>
      </div>
    );
  },
);

const CollapsibleToggle = ({
  onExpand,
  isExpanded,
  hasChildNodes,
  ...props
}: {
  onExpand: (e: React.MouseEvent<SVGSVGElement>) => void;
  isExpanded: boolean;
  hasChildNodes: boolean;
}) => {
  if (hasChildNodes) {
    return isExpanded ? (
      <ChevronDown
        role="button"
        onClick={onExpand}
        strokeWidth="1.13"
        className="size-[18px] cursor-pointer flex-shrink-0"
        {...props}
      />
    ) : (
      <ChevronRight
        role="button"
        onClick={onExpand}
        strokeWidth="1.13"
        className="size-[18px] cursor-pointer flex-shrink-0"
        {...props}
      />
    );
  }

  return <div className="size-[18px]" {...props}></div>;
};

TreeViewItem.displayName = 'TreeViewItem';

export { flattenTree, TreeView, TreeViewItem };
