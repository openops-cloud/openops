import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';
import { TestRunLimitsForm } from '../../components/test-run-limits-form/test-run-limits-form';
import { TooltipProvider } from '../../ui/tooltip';

const sampleLimits = [
  {
    blockName: 'slack',
    actionName: 'send_message',
    isEnabled: true,
    limit: 10,
  },
  {
    blockName: 'aws',
    actionName: 'tag_resource',
    isEnabled: false,
    limit: 10,
  },
  {
    blockName: 'azure',
    actionName: 'cli',
    isEnabled: true,
    limit: 10,
  },
  {
    blockName: 'slack',
    actionName: 'send_message_2',
    isEnabled: true,
    limit: 10,
  },
  {
    blockName: 'aws',
    actionName: 'tag_resource_2',
    isEnabled: false,
    limit: 10,
  },
  {
    blockName: 'azure',
    actionName: 'cli_2',
    isEnabled: true,
    limit: 10,
  },
  {
    blockName: 'slack',
    actionName: 'send_message_3',
    isEnabled: true,
    limit: 10,
  },
  {
    blockName: 'aws',
    actionName: 'tag_resource_3',
    isEnabled: false,
    limit: 10,
  },
  {
    blockName: 'azure',
    actionName: 'cli_3',
    isEnabled: true,
    limit: 10,
  },
];

const blockActionMetaMap = {
  slack: {
    displayName: 'Slack',
    logoUrl: 'https://static.openops.com/blocks/slack.png',
    actions: {
      send_message: 'Send Message',
      send_message_2: 'Send Message 2',
      send_message_3: 'Send Message 3',
    },
  },
  aws: {
    displayName: 'AWS',
    logoUrl: 'https://static.openops.com/blocks/aws.png',
    actions: {
      tag_resource: 'Tag Resource',
      tag_resource_2: 'Tag Resource 2',
      tag_resource_3: 'Tag Resource 3',
    },
  },
  azure: {
    displayName: 'Azure',
    logoUrl: 'https://static.openops.com/blocks/azure.svg',
    actions: {
      cli: 'CLI',
      cli_2: 'CLI 2',
      cli_3: 'CLI 3',
    },
  },
} as const;

const defaultValue = {
  isEnabled: true,
  limits: sampleLimits.slice(0, 3),
};

const meta: Meta<typeof TestRunLimitsForm> = {
  title: 'Components/TestRunLimitsForm',
  component: TestRunLimitsForm,
  args: {
    value: defaultValue,
    blockActionMetaMap,
    isLoading: false,
    className: 'max-w-2xl',
  },
  decorators: [ThemeAwareDecorator],
  argTypes: {
    onSave: { action: 'onSave' },
  },
  parameters: {
    layout: 'padded',
  },
  render: (args) => (
    <TooltipProvider>
      <div className="w-[610px]">
        <TestRunLimitsForm {...args} />
      </div>
    </TooltipProvider>
  ),
  tags: ['autodocs'],
};

export default meta;

export type Story = StoryObj<typeof TestRunLimitsForm>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};

export const LongList: Story = {
  args: {
    isLoading: false,
    value: {
      isEnabled: true,
      limits: sampleLimits,
    },
  },
};

export const Empty: Story = {
  args: {
    isLoading: false,
    value: {
      isEnabled: true,
      limits: [],
    },
  },
};
