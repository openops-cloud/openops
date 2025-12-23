import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';
import {
  AiScopeItem,
  AiScopeSelector,
  AiScopeType,
} from '../../components/ai-chat-container/ai-scope-selector';
import { TooltipProvider } from '../../ui/tooltip';
import { sampleScopeOptions } from './sample-scope-options';

/**
 * `AiScopeSelector` is a component that allows users to select and manage scope items for AI chat context.
 *
 * It provides:
 * - A dropdown to select from available scope options
 * - A search functionality to filter available options
 * - Display of selected scope items with the ability to remove them
 *
 * This component is typically used to provide additional context to AI chat by attaching relevant steps or resources.
 */

// Wrapper component to demonstrate stateful behavior
interface StatefulAiScopeSelectorProps {
  options: AiScopeItem[];
  initialSelectedItems?: AiScopeItem[];
}

const StatefulAiScopeSelector = ({
  options,
  initialSelectedItems = [],
}: StatefulAiScopeSelectorProps) => {
  const [selectedItems, setSelectedItems] =
    useState<AiScopeItem[]>(initialSelectedItems);

  const handleScopeSelected = (scope: AiScopeItem) => {
    action('Scope selected')(scope);
    setSelectedItems((prev) => [...prev, scope]);
  };

  const handleScopeItemRemove = (id: string) => {
    action('Scope item removed')(id);
    setSelectedItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="w-[350px]">
      <AiScopeSelector
        options={options}
        selectedItems={selectedItems}
        onScopeSelected={handleScopeSelected}
        onAiScopeItemRemove={handleScopeItemRemove}
      />
    </div>
  );
};
const meta = {
  title: 'components/AiChat/AiScopeSelector',
  component: AiScopeSelector,
  tags: ['autodocs'],
  decorators: [ThemeAwareDecorator],
  args: {
    options: sampleScopeOptions,
    onScopeSelected: action('Scope selected'),
    onAiScopeItemRemove: action('Scope item removed'),
  },
  parameters: {
    layout: 'centered',
  },
  render: (args) => (
    <TooltipProvider>
      <StatefulAiScopeSelector {...args} />
    </TooltipProvider>
  ),
} satisfies Meta<typeof AiScopeSelector>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default AiScopeSelector with available options but no selected items.
 * Users can click the "Add step context..." button to open a dropdown of available options.
 */
export const Default: Story = {};

/**
 * AiScopeSelector with some pre-selected scope items.
 * This demonstrates how the component displays selected items and allows for their removal.
 */
export const WithSelectedItems: Story = {
  args: {
    selectedItems: [
      {
        id: '1',
        displayName: '1. Code',
        type: AiScopeType.STEP,
        logoUrl: '/blocks/code.svg',
      },
      {
        id: '3',
        displayName: '3. Azure CLI',
        type: AiScopeType.STEP,
        logoUrl: '/blocks/azure.svg',
      },
    ],
  },
};

/**
 * AiScopeSelector with no available options.
 * This demonstrates how the component behaves when there are no options to select from.
 */
export const NoOptions: Story = {
  args: {
    options: [],
  },
};
