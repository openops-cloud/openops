import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';
import { SetRunLimits } from '../../components/set-run-limits/set-run-limits';
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

const blockDiplayNames: Record<string, string> = {
  slack: 'Slack',
  aws: 'AWS',
  azure: 'Azure',
};

const actionDiplayNames: Record<string, string> = {
  send_message: 'Send Message',
  tag_resource: 'Tag Resource',
  cli: 'CLI',
  send_message_2: 'Send Message 2',
  tag_resource_2: 'Tag Resource 2',
  cli_2: 'CLI 2',
  send_message_3: 'Send Message 3',
  tag_resource_3: 'Tag Resource 3',
  cli_3: 'CLI 3',
};

const blockLogoUrls: Record<string, string> = {
  slack: 'https://static.openops.com/blocks/slack.png',
  aws: 'https://static.openops.com/blocks/aws.png',
  azure: 'https://static.openops.com/blocks/azure.svg',
};

const defaultValue = {
  isEnabled: true,
  limits: sampleLimits.slice(0, 3),
};

const meta: Meta<typeof SetRunLimits> = {
  title: 'Components/SetRunLimits',
  component: SetRunLimits,
  args: {
    value: defaultValue,
    blockDiplayNames,
    actionDiplayNames,
    blockLogoUrls,
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
        <SetRunLimits {...args} />
      </div>
    </TooltipProvider>
  ),
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof SetRunLimits>;

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
