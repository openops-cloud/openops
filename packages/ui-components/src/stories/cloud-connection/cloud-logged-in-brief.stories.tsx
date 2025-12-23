import type { Meta, StoryObj } from '@storybook/react';
import { CloudLoggedInBrief } from '../../components/cloud-connection/cloud-logged-in-brief';
import { cn } from '../../lib/cn';

const meta = {
  title: 'ui/CloudConnection/CloudLoggedInBrief',
  component: CloudLoggedInBrief,
  parameters: {
    layout: 'centered',
  },

  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: 600,
          maxHeight: 600,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CloudLoggedInBrief>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    appLogo: (
      <div className={cn('h-[60px]')}>
        <img className="h-full" alt="logo" src="/logos/logo.positive.svg" />
      </div>
    ),
  },
};
