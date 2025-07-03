import type { Meta, StoryObj } from '@storybook/react';

import { ThemeAwareDecorator } from '../../.storybook/decorators';
import { GenerateWithAIButton } from '../components/generate-with-ai/generate-with-ai';

/**
 * A button that either allows users to generate content with AI or directs them to configure AI settings.
 */
const meta = {
  title: 'components/GenerateWithAIButton',
  component: GenerateWithAIButton,
  tags: ['autodocs'],
  argTypes: {
    hasActiveAiSettings: {
      control: 'boolean',
      description: 'Whether the user has active AI settings configured',
    },
    isLoading: {
      control: 'boolean',
      description: 'Whether the AI generation is in progress',
    },
    isAiChatVisible: {
      control: 'boolean',
      description: 'Whether the AI chat is currently visible',
    },
    settingsPath: {
      control: 'text',
      description: 'Path to the AI settings page',
    },
    onGenerateWithAIClick: {
      action: 'clicked',
      description: 'Callback function when generate button is clicked',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
    iconSize: {
      control: 'number',
      description: 'Size of the sparkles icon',
    },
  },
  parameters: {
    layout: 'centered',
  },
  decorators: [ThemeAwareDecorator],
  args: {
    hasActiveAiSettings: true,
    isLoading: false,
    isAiChatVisible: false,
    settingsPath: '/settings/ai',
    iconSize: 20,
    onGenerateWithAIClick: () => {},
  },
} satisfies Meta<typeof GenerateWithAIButton>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default state when AI settings are configured and ready to use.
 */
export const Default: Story = {};

/**
 * Shows the loading state when AI is generating content.
 */
export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

/**
 * Shows the active state when AI chat is visible.
 */
export const AiChatVisible: Story = {
  args: {
    isAiChatVisible: true,
  },
};

/**
 * Shows the configure state when no AI settings are available.
 * Displays as a link to the settings page.
 */
export const ConfigureAI: Story = {
  args: {
    hasActiveAiSettings: false,
  },
};

/**
 * Shows the button with a smaller icon size.
 */
export const SmallIcon: Story = {
  args: {
    iconSize: 16,
  },
};

/**
 * Shows the button with a larger icon size.
 */
export const LargeIcon: Story = {
  args: {
    iconSize: 24,
  },
};

/**
 * Shows the configure AI state with loading (edge case).
 */
export const ConfigureAILoading: Story = {
  args: {
    hasActiveAiSettings: false,
    isLoading: true,
  },
};

/**
 * Shows the button with custom styling.
 */
export const CustomStyling: Story = {
  args: {
    className: 'text-purple-500 hover:text-purple-600',
  },
};
