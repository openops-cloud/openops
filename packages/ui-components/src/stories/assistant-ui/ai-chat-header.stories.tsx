import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { Bell, BookOpen, HelpCircle, Settings } from 'lucide-react';

import { AiChatHeader } from '../../components/assistant-ui/ai-chat-header';
import { Button } from '../../ui/button';
import { TooltipProvider } from '../../ui/tooltip';

/**
 * `AiChatHeader` is a header component for AI chat interfaces.
 *
 * It provides:
 * - A new chat button for starting fresh conversations
 * - A title indicating the AI assistant
 * - A close button for dismissing the chat interface
 * - Support for custom children elements in the header
 *
 * The component handles user interactions like creating new chats and closing the chat interface.
 */
const meta = {
  title: 'assistant-ui/AiChatHeader',
  component: AiChatHeader,
  tags: ['autodocs'],
  args: {
    onClose: action('Close clicked'),
    onNewChat: action('New chat clicked'),
    enableNewChat: true,
    children: null,
  },
  argTypes: {
    onClose: {
      description: 'Function called when the close button is clicked',
    },
    onNewChat: {
      description: 'Function called when the new chat button is clicked',
    },
    enableNewChat: {
      description: 'Whether the new chat button is enabled',
      control: 'boolean',
    },
    children: {
      description: 'Optional elements to render in the header',
    },
  },
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="w-[600px] border border-gray-200 rounded-md">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof AiChatHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default AiChatHeader with enabled new chat button.
 * Users can click the new chat button to start a fresh conversation or the close button to dismiss the chat interface.
 */
export const Default: Story = {};

/**
 * AiChatHeader with the new chat button disabled.
 * This demonstrates how the component appears when starting a new chat is not allowed.
 */
export const NewChatDisabled: Story = {
  args: {
    enableNewChat: false,
  },
};

/**
 * AiChatHeader with additional action buttons.
 * This demonstrates how the component can be extended with custom controls.
 */
export const WithActionButtons: Story = {
  args: {
    children: (
      <>
        <Button
          onClick={action('Settings clicked')}
          variant="secondary"
          size="icon"
          className="text-outline size-[36px]"
        >
          <Settings size={20} />
        </Button>
        <Button
          onClick={action('Help clicked')}
          variant="secondary"
          size="icon"
          className="text-outline size-[36px]"
        >
          <HelpCircle size={20} />
        </Button>
      </>
    ),
  },
};

/**
 * AiChatHeader with a single additional button.
 * This demonstrates a simpler customization with just one extra control.
 */
export const WithSingleButton: Story = {
  args: {
    children: (
      <Button
        onClick={action('Notifications clicked')}
        variant="secondary"
        size="icon"
        className="text-outline size-[36px]"
      >
        <Bell size={20} />
      </Button>
    ),
  },
};

/**
 * AiChatHeader with multiple action buttons and disabled new chat.
 * This demonstrates a more complex configuration with multiple custom controls and a disabled state.
 */
export const ComplexExample: Story = {
  args: {
    enableNewChat: false,
    children: (
      <>
        <Button
          onClick={action('Documentation clicked')}
          variant="secondary"
          size="icon"
          className="text-outline size-[36px]"
        >
          <BookOpen size={20} />
        </Button>
        <Button
          onClick={action('Settings clicked')}
          variant="secondary"
          size="icon"
          className="text-outline size-[36px]"
        >
          <Settings size={20} />
        </Button>
      </>
    ),
  },
};

/**
 * AiChatHeader with a custom new chat icon.
 * This demonstrates how the component would look with a different icon for the new chat button.
 */
export const CustomNewChatIcon: Story = {
  render: (args) => <AiChatHeader {...args}>{args.children}</AiChatHeader>,
  args: {
    children: null,
  },
};
