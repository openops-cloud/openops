import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { AiChatInput } from '../../components/ai-chat-container/ai-chat-input';

/**
 * `AiChatInput` is a comprehensive chat input component for AI interactions.
 *
 * It provides:
 * - A textarea that automatically resizes based on content
 * - A send button for submitting messages
 * - An integrated model selector for choosing AI models
 * - Support for keyboard shortcuts (Enter to send, Shift+Enter for new line)
 *
 * The component handles user input, message submission, and model selection in one unified interface.
 */
const meta = {
  title: 'components/AiChat/AiChatInput',
  component: AiChatInput,
  tags: ['autodocs'],
  args: {
    input: '',
    handleInputChange: action('Input changed'),
    handleSubmit: action('Message submitted'),
    selectedModel: 'gpt-4',
    availableModels: [
      'gpt-3.5-turbo',
      'gpt-4',
      'gpt-4-turbo',
      'claude-2',
      'claude-instant',
      'gemini-pro',
    ],
    onModelSelected: action('Model selected'),
    isModelSelectorLoading: false,
    placeholder: 'Type your message here...',
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof AiChatInput>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default AiChatInput with an empty input field.
 * Users can type in the textarea, press Enter to submit, or click the send button.
 * The model selector shows multiple available models.
 */
export const Default: Story = {};

/**
 * AiChatInput with pre-filled text to show how it looks with content.
 * This demonstrates the component's appearance when a user has typed a message.
 */
export const WithText: Story = {
  args: {
    input: 'How can I create a workflow that integrates with Slack?',
  },
};

/**
 * AiChatInput with only one available model.
 * When only one model is available, the model selector is displayed as a simple badge
 * without dropdown functionality.
 */
export const SingleModelOnly: Story = {
  args: {
    availableModels: ['gpt-4'],
  },
};

/**
 * AiChatInput in a loading state while models are being fetched.
 * This shows a loading spinner in the model selector.
 */
export const LoadingModels: Story = {
  args: {
    isModelSelectorLoading: true,
  },
};

/**
 * AiChatInput with a custom placeholder text.
 * This demonstrates how the component can be customized with different prompt text.
 */
export const CustomPlaceholder: Story = {
  args: {
    placeholder: 'Ask me anything about OpenOps...',
  },
};
