import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SearchInput } from '../../components';

const SearchInputWithState = (args: any) => {
  const [searchValue, setSearchValue] = useState(args.value);

  return (
    <SearchInput {...args} value={searchValue} onChange={setSearchValue} />
  );
};

/**
 * Displays an search input.
 */
const meta = {
  title: 'Components/SearchInput',
  component: SearchInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    onChange: (search) => {},
  },
  argTypes: {
    onChange: {
      table: {
        disable: true,
      },
    },
  },
  render: (args) => <SearchInputWithState {...args} />,
} satisfies Meta<typeof SearchInput>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default variant of the SearchInput component.
 */
export const Default: Story = {};

/**
 * Search input with custom placeholder.
 */
export const WithCustomPlaceholder: Story = {
  args: {
    placeholder: 'Custom placeholder',
  },
};

/**
 * Search input with initial value.
 */
export const WithInitialValue: Story = {
  args: {
    value: 'Initial value',
  },
};
