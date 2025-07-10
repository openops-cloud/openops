import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { AiChatInput } from '../../components/ai-chat-container/ai-chat-input';
import { TooltipProvider } from '../../ui/tooltip';
import { sampleScopeOptions } from './sample-scope-options';

/**
 * `AiChatInput` is a comprehensive chat input component for AI interactions.
 *
 * It provides:
 * - A textarea that automatically resizes based on content
 * - A send button for submitting messages
 * - An integrated model selector for choosing AI models
 * - Support for keyboard shortcuts (Enter to send, Shift+Enter for new line)
 * - An optional scope selector for adding context to AI conversations
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
  render: (args) => {
    return (
      <TooltipProvider>
        <AiChatInput {...args} />
      </TooltipProvider>
    );
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

/**
 * AiChatInput with scope selector functionality.
 * This demonstrates how the component can be used to add context from steps to the AI conversation.
 * Users can add and remove scope items to provide additional context to their queries.
 */
export const WithScopeSelector: Story = {
  args: {
    input: '',
    placeholder: 'Type your message here...',
    scopeOptions: sampleScopeOptions,
    selectedScopeItems: [],
    onScopeSelected: action('Scope selected'),
    onAiScopeItemRemove: action('Scope item removed'),
  },
};

/**
 * AiChatInput with pre-selected scope items.
 * This demonstrates how the component looks when scope items are already selected.
 */
export const WithPreselectedScopeItems: Story = {
  args: {
    input: 'How can I optimize this code?',
    placeholder: 'Type your message here...',
    scopeOptions: sampleScopeOptions,
    selectedScopeItems: [
      sampleScopeOptions[0],
      sampleScopeOptions[2],
      sampleScopeOptions[3],
      sampleScopeOptions[4],
      sampleScopeOptions[5],
      sampleScopeOptions[6],
      sampleScopeOptions[7],
      sampleScopeOptions[8],
      sampleScopeOptions[9],
      sampleScopeOptions[10],
    ],
    onScopeSelected: action('Scope selected'),
    onAiScopeItemRemove: action('Scope item removed'),
  },
};
