import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { AiModelSelector } from '../../components/ai-chat-container/ai-model-selector';

/**
 * `AiModelSelector` is a component for selecting AI models in a chat interface.
 *
 * Features:
 * - Displays the currently selected model in a badge
 * - Provides a dropdown menu for selecting from available models
 * - Includes search functionality to filter models
 * - Shows a loading state when models are being fetched
 * - Automatically disables dropdown when only one model is available
 * - Supports keyboard navigation and accessibility
 *
 * This component is typically used within the AiChatInput but can also be used standalone.
 */
const meta = {
  title: 'components/AiChat/AiModelSelector',
  component: AiModelSelector,
  tags: ['autodocs'],
  args: {
    selectedModel: 'gpt-4',
    availableModels: [
      'gpt-3.5-turbo',
      'gpt-4',
      'gpt-4-turbo',
      'claude-2',
      'claude-instant',
      'gemini-pro',
      'llama-2-70b',
      'mistral-7b',
    ],
    onModelSelected: action('Model selected'),
    isModelSelectorLoading: false,
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof AiModelSelector>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default AiModelSelector with multiple available models.
 * Users can click on the badge to open a dropdown with search functionality.
 */
export const Default: Story = {};

/**
 * When only one model is available, the selector is displayed as a simple badge
 * without the dropdown functionality. The chevron icon is hidden and clicking
 * the badge has no effect.
 */
export const SingleModelOnly: Story = {
  args: {
    availableModels: ['gpt-4'],
  },
};

/**
 * Shows the AiModelSelector in a loading state.
 * A loading spinner is displayed next to the model name, indicating that
 * the list of available models is being fetched.
 */
export const Loading: Story = {
  args: {
    isModelSelectorLoading: true,
  },
  parameters: {
    chromatic: { disable: true },
  },
};

/**
 * AiModelSelector with a different model selected.
 * This demonstrates how the component looks with various selected models.
 */
export const AlternativeModelSelected: Story = {
  args: {
    selectedModel: 'claude-2',
  },
};

/**
 * AiModelSelector with custom styling applied.
 * This demonstrates how the component can be customized with additional CSS classes.
 */
export const CustomStyling: Story = {
  args: {
    className: 'bg-gray-100 p-2 rounded-md',
  },
};
