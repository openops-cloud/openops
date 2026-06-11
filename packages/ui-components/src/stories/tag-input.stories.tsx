import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { TagInput } from '@/ui/tag-input';

/**
 * A chips-style input for entering multiple values. Press Enter or type a
 * comma to commit a value. Values may contain spaces (e.g. "pending migration").
 * Backspace on an empty input removes the last chip.
 */
const meta = {
  title: 'ui/TagInput',
  component: TagInput,
  tags: ['autodocs'],
} satisfies Meta<typeof TagInput>;

export default meta;

type Story = StoryObj<typeof meta>;

const Demo = () => {
  const [value, setValue] = useState<ReadonlyArray<string>>([
    'compliance',
    'pending migration',
  ]);
  return (
    <div className="max-w-md">
      <TagInput
        value={value}
        onChange={setValue}
        placeholder="Type a value and press Enter"
      />
    </div>
  );
};

/**
 * Interactive demo with pre-populated chips. Type a value and press Enter (or
 * use a comma to separate multiple values). Click the ✕ on any chip to remove
 * it, or press Backspace on an empty input to remove the last chip.
 */
export const Default: Story = {
  args: { value: [], onChange: () => undefined },
  render: () => <Demo />,
};
