import { BuilderTreeView, BuilderTreeViewProvider } from '@/components';
import {
  BuilderTreeView as BuilderTreeViewEagerLoaded,
  BuilderTreeViewProps,
} from '@/components/builder-tree-view/builder-tree-view';
import type { ArgTypes, Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { selectLightOrDarkCanvas } from '../../test-utils/select-themed-canvas.util';
import { TooltipProvider } from '../../ui/tooltip';
import {
  allNestedCollapsibleNodes,
  blockNode,
  complexTreeNode,
  conditionNode,
  expandCollapseAllButtonIconTestIds,
  labelTexts,
  loopNode,
  rootNode,
  splitNode,
  triggerNode,
} from './treeNode';

/**
 * Displays a tree view component
 */
const meta: Meta<typeof BuilderTreeViewEagerLoaded> = {
  title: 'components/BuilderTreeView',
  component: BuilderTreeViewEagerLoaded,
  tags: ['autodocs'],
  argTypes: {
    selectedId: {
      control: { type: 'text' },
      description: 'The selected ID for the BuilderTreeViewProvider',
    },
    onSelect: {
      description: 'function to handle the selection of a node',
    },
    onClose: {
      description: 'function to handle the closing of the tree view',
    },
    treeNode: {
      description: 'The tree node to display',
      control: 'object',
    },
  } as Partial<ArgTypes<BuilderTreeViewProps>>,
  args: {
    onSelect: fn(),
    onClose: fn(),
  },
  parameters: {
    layout: 'centered',
    docs: {
      story: {
        autoplay: true,
      },
    },
  },
  render: (args) => (
    <TooltipProvider>
      <div className="w-[400px] bg-background">
        <BuilderTreeViewProvider selectedId={args.selectedId}>
          <BuilderTreeView {...args} />
        </BuilderTreeViewProvider>
      </div>
    </TooltipProvider>
  ),
} satisfies Meta<typeof BuilderTreeViewEagerLoaded>;

export default meta;

type Story = StoryObj<typeof meta>;
const treeItemSelector = '[role="treeitem"]';
const branchElSelector = '[data-treeview-is-branch="true"]';

/**
 * Displays a Split node
 */
export const SplitNode: Story = {
  args: {
    treeNode: {
      ...rootNode,
      children: [splitNode],
    },
    selectedId: splitNode.children[0].id,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    const defaultBranch = await canvas.findByText(labelTexts.defaultBranch);

    expect(defaultBranch.nextElementSibling?.tagName).toBe('svg');

    const [{ children }] = args.treeNode.children;
    children
      .filter((child) => child.children.length > 0)
      .forEach(async (child) => {
        (await canvas.findByText(child.name)).closest<HTMLElement>(
          branchElSelector,
        );
      });
  },
};

/**
 * Displays a Condition node
 */
export const ConditionNode: Story = {
  args: {
    treeNode: {
      ...rootNode,
      children: [conditionNode],
    },
    selectedId: conditionNode.children[0].id,
  },
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    await canvas.findByText(labelTexts.branch1);
    await canvas.findByText(labelTexts.branch2);
  },
};

/**
 * Displays a Loop node
 */
export const LoopNode: Story = {
  args: {
    selectedId: loopNode.children[0].id,
    treeNode: {
      ...rootNode,
      children: [
        {
          ...loopNode,
          children: [conditionNode, blockNode],
        },
      ],
    },
  },
};

/**
 * Displays a complex tree node structure
 */
export const ComplexTreeStructure: Story = {
  args: {
    treeNode: complexTreeNode,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    (await canvas.findByLabelText('Close')).click();

    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

/**
 * Expand deeply nested node and select it
 */
export const WithManuallySelectedLeafNode: Story = {
  args: {
    treeNode: complexTreeNode,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);

    const loopNodeLabelEl = await canvas.findByText(labelTexts.loopNodeName);
    const loopNode = loopNodeLabelEl.closest<HTMLElement>(treeItemSelector)!;

    await userEvent.click(loopNodeLabelEl);
    expect(loopNode).toHaveAttribute('aria-expanded', 'true');

    const conditionNodeLabelEl = await within(loopNode).findByText(
      labelTexts.conditionNodeName,
    );
    const conditionNode =
      conditionNodeLabelEl.closest<HTMLElement>(treeItemSelector)!;

    await userEvent.click(conditionNodeLabelEl);
    expect(conditionNode).toHaveAttribute('aria-expanded', 'true');
    const branchNodeLabelEl = await within(conditionNode).findByText(
      labelTexts.branch1,
    );
    const branchNode =
      branchNodeLabelEl.closest<HTMLElement>(treeItemSelector)!;

    await userEvent.click(branchNodeLabelEl);
    expect(branchNode).toHaveAttribute('aria-expanded', 'true');
    (await within(branchNode).findByText(labelTexts.blockNodeName)).click();
    await waitFor(() => expect(args.onSelect).toHaveBeenCalled());
  },
};

/**
 * Expand deeply nested node and select it
 */
export const WithMissingMetadataNodeName: Story = {
  args: {
    treeNode: {
      ...rootNode,
      children: [
        { ...triggerNode, metadata: { nodeName: '', nodeType: 'EMPTY' } },
      ],
    },
  },
  parameters: {
    chromatic: { disable: true },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);

    (await canvas.findByText(labelTexts.triggerNodeName)).click();
    await waitFor(() => expect(args.onSelect).toHaveBeenCalled());
  },
};

/**
 * Illustrates a tree containing a node with a truncated long name
 */
export const WithLongTrunctedNodeName: Story = {
  args: {
    selectedId: splitNode.id,
    treeNode: {
      ...rootNode,
      children: [
        triggerNode,
        loopNode,
        {
          ...splitNode,
          children: [
            {
              ...splitNode.children[0],
              name: labelTexts.longNodeName,
            },
            splitNode.children[1],
            {
              ...splitNode.children[2],
              name: labelTexts.longNodeName2,
            },
          ],
        },
        {
          ...blockNode,
          name: labelTexts.longNodeName3,
          metadata: {
            ...blockNode.metadata,
          },
        },
      ],
    },
  },
};

/**
 * Expand deeply nested nodes and collapse all
 */
export const ExpandAndCollapseAll: Story = {
  args: {
    treeNode: allNestedCollapsibleNodes,
  },
  parameters: {
    chromatic: { disable: true },
  },
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);

    await waitFor(async () => {
      expect(
        await canvas.findByTestId(expandCollapseAllButtonIconTestIds.expand),
      ).toBeInTheDocument();
    });
    (
      await canvas.findByTestId(expandCollapseAllButtonIconTestIds.expand)
    ).parentElement?.click();
    expect(await canvas.findByText(labelTexts.longNodeName)).toBeVisible();

    await waitFor(async () => {
      expect(
        await canvas.findByTestId(expandCollapseAllButtonIconTestIds.collapse),
      ).toBeInTheDocument();
    });
    (
      await canvas.findByTestId(expandCollapseAllButtonIconTestIds.collapse)
    ).parentElement?.click();
    expect(await canvas.findByText(labelTexts.longNodeName)).not.toBeVisible();
  },
};
