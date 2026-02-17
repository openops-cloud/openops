import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';
import { FinOpsBenchmarkBanner } from '../../components/finops-benchmark-banner/finops-benchmark-banner';

const meta = {
  title: 'Components/FinOpsBenchmarkBanner',
  component: FinOpsBenchmarkBanner,
  tags: ['autodocs'],
  args: {
    onActionClick: action('Run a Benchmark clicked'),
    onViewReportClick: action('View Report clicked'),
  },
  decorators: [ThemeAwareDecorator],
  parameters: {
    layout: 'centered',
  },
  render: (args) => (
    <div className="w-[1024px]">
      <FinOpsBenchmarkBanner {...args} />
    </div>
  ),
} satisfies Meta<typeof FinOpsBenchmarkBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AwsReport: Story = {
  args: {
    variation: 'report',
    provider: 'aws',
  },
};

export const AzureReport: Story = {
  args: {
    variation: 'report',
    provider: 'azure',
  },
};
