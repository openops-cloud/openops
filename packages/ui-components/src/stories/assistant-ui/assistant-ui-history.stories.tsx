import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';

import { ThemeAwareDecorator } from '../../../.storybook/decorators';
import { AssistantUiHistory } from '../../components/assistant-ui/history/assistant-ui-history';
import { TooltipProvider } from '../../ui/tooltip';

/**
 * `AssistantUiHistory` is a component that displays a list of chat history items with the ability to create a new chat.
 *
 * It provides:
 * - A "New chat" button for starting fresh conversations
 * - A list of chat history items that can be selected
 * - The ability to delete chat items
 * - Visual indication of the currently selected chat
 *
 * The component handles user interactions like creating new chats, selecting existing chats, and deleting chats.
 */
const meta = {
  title: 'assistant-ui/AssistantUiHistory',
  component: AssistantUiHistory,
  tags: ['autodocs'],
  args: {
    onNewChat: action('New chat clicked'),
    newChatDisabled: false,
    onChatSelected: action('Chat selected'),
    onChatDeleted: action('Chat deleted'),
    onChatRenamed: action('Chat renamed'),
    chatItems: [
      { id: '1', displayName: 'Chat about API integration' },
      { id: '2', displayName: 'Workflow optimization discussion' },
      { id: '3', displayName: 'Troubleshooting deployment issues' },
    ],
    selectedItemId: '1',
  },
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="w-[300px] max-h-[400px] overflow-hidden py-2 flex">
          <Story />
        </div>
      </TooltipProvider>
    ),
    ThemeAwareDecorator,
  ],
} satisfies Meta<typeof AssistantUiHistory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default AssistantUiHistory with a list of chat items and one selected.
 * Users can click on chat items to select them, delete them, or create a new chat.
 */
export const Default: Story = {};

/**
 * AssistantUiHistory with no chat items.
 * This demonstrates how the component appears when there are no existing chats.
 */
export const EmptyHistory: Story = {
  args: {
    chatItems: [],
    selectedItemId: '',
  },
};

/**
 * AssistantUiHistory with the new chat button disabled.
 * This demonstrates how the component appears when creating a new chat is not allowed.
 **/
export const NewChatDisabled: Story = {
  args: {
    newChatDisabled: true,
  },
};

/**
 * AssistantUiHistory with many chat items to demonstrate scrolling behavior.
 * This shows how the component handles a large number of chat items.
 */
export const ManyItems: Story = {
  args: {
    chatItems: Array.from({ length: 20 }, (_, i) => ({
      id: `${i + 1}`,
      displayName: `Chat ${i + 1}: ${
        i % 2 === 0 ? 'API Discussion' : 'Workflow Optimization'
      } ${i % 3 === 0 ? '(with examples)' : ''}`,
    })),
    selectedItemId: '5',
  },
};

/**
 * AssistantUiHistory with very long chat names to demonstrate text truncation.
 * This shows how the component handles chat items with long display names.
 */
export const LongChatNames: Story = {
  args: {
    chatItems: [
      {
        id: '1',
        displayName:
          'This is a very long chat name that should be truncated when displayed in the UI to prevent layout issues',
      },
      {
        id: '2',
        displayName:
          'Another extremely long chat name that demonstrates how the component handles text overflow with ellipsis',
      },
      { id: '3', displayName: 'Short name' },
    ],
    selectedItemId: '1',
  },
};

/**
 * AssistantUiHistory with custom styling applied.
 * This demonstrates how the component can be styled using the className prop.
 */
export const CustomStyling: Story = {
  args: {
    className: 'bg-slate-100 dark:bg-slate-800 rounded-lg p-2',
  },
};
