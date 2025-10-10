import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';
import {
  RunLimitItem,
  SetRunLimits,
  SetRunLimitsValue,
} from '../../components/set-run-limits/set-run-limits';
import { TooltipProvider } from '../../ui/tooltip';

const sampleLimits: RunLimitItem[] = [
  {
    blockName: 'Slack',
    actionName: 'send_message',
    blockDisplayName: 'Slack',
    actionDisplayName: 'Send Message',
    logoUrl: 'https://static.openops.com/blocks/slack.png',
    isEnabled: true,
    limit: 10,
  },
  {
    blockName: 'AWS',
    actionName: 'Tag Resource',
    logoUrl: 'https://static.openops.com/blocks/aws.png',
    isEnabled: false,
    limit: 10,
  },
  {
    blockName: 'Azure',
    actionName: 'CLI',
    logoUrl: 'https://static.openops.com/blocks/azure.svg',
    isEnabled: true,
    limit: 10,
  },
  {
    blockName: 'Slack',
    actionName: 'Send Message2',
    logoUrl: 'https://static.openops.com/blocks/slack.png',
    isEnabled: true,
    limit: 10,
  },
  {
    blockName: 'AWS',
    actionName: 'Tag Resource2',
    logoUrl: 'https://static.openops.com/blocks/aws.png',
    isEnabled: false,
    limit: 10,
  },
  {
    blockName: 'Azure',
    actionName: 'CLI2',
    logoUrl: 'https://static.openops.com/blocks/azure.svg',
    isEnabled: true,
    limit: 10,
  },
  {
    blockName: 'Slack',
    actionName: 'Send Message3',
    logoUrl: 'https://static.openops.com/blocks/slack.png',
    isEnabled: true,
    limit: 10,
  },
  {
    blockName: 'AWS',
    actionName: 'Tag Resource3',
    logoUrl: 'https://static.openops.com/blocks/aws.png',
    isEnabled: false,
    limit: 10,
  },
  {
    blockName: 'Azure',
    actionName: 'CLI3',
    logoUrl: 'https://static.openops.com/blocks/azure.svg',
    isEnabled: true,
    limit: 10,
  },
];

const defaultValue: SetRunLimitsValue = {
  enabled: true,
  limits: sampleLimits.slice(0, 3),
};

const meta: Meta<typeof SetRunLimits> = {
  title: 'Components/SetRunLimits',
  component: SetRunLimits,
  args: {
    value: defaultValue,
    isLoading: false,
    className: 'max-w-2xl',
  },
  decorators: [ThemeAwareDecorator],
  argTypes: {
    onSave: { action: 'onSave' },
    onChange: { action: 'onChange' },
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
      enabled: true,
      limits: sampleLimits,
    },
  },
};

export const Empty: Story = {
  args: {
    isLoading: false,
    value: {
      enabled: true,
      limits: [],
    },
  },
};
