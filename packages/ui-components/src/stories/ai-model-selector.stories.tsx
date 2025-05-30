import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { AiModelSelector } from '../components/ai-chat-container/ai-model-selector';

/**
 * A component that displays the selected AI model and allows users to select from available models.
 * Shows a chevron if multiple options are available and provides a searchable dropdown.
 */
const meta = {
  title: 'components/AiModelSelector',
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
    onModelSelected: action('AiModelSelector selected model changed'),
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
 * without the dropdown functionality.
 */
export const SingleModelOnly: Story = {
  args: {
    availableModels: ['gpt-4'],
  },
};
