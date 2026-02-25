import type { Meta, StoryObj } from '@storybook/react';
import { ThemeAwareDecorator } from '../../../.storybook/decorators';
import { BenchmarkCreatingPlaceholder } from '../../components/benchmark/benchmark-creating-placeholder';

const meta = {
  title: 'Components/Benchmark/BenchmarkCreatingPlaceholder',
  component: BenchmarkCreatingPlaceholder,
  tags: ['autodocs'],
  decorators: [ThemeAwareDecorator],
  parameters: { layout: 'centered' },
  render: () => (
    <div className="w-[460px] h-[200px]">
      <BenchmarkCreatingPlaceholder />
    </div>
  ),
} satisfies Meta<typeof BenchmarkCreatingPlaceholder>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
