import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';
import { AutocompleteInput } from '../ui/autocomplete-input';

/**
 * An input field that supports autocompletion from a list of options.
 */
const meta = {
  title: 'ui/AutocompleteInput',
  component: AutocompleteInput,
  tags: ['autodocs'],
  args: {
    placeholder: 'Select an option...',
    options: [
      { value: '1', label: 'Apple' },
      { value: '2', label: 'Banana' },
      { value: '3', label: 'Cherry' },
    ],
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof AutocompleteInput>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default autocomplete input, allowing users to search and select from a list.
 */
export const Default: Story = {};

/**
 * Preselect a value by setting the `value` prop.
 */
export const WithPreselectedValue: Story = {
  args: {
    value: 'banana',
  },
};

/**
 * Use the `disabled` prop to make the input non-interactive and appears faded,
 * indicating that input is not currently accepted.
 */
export const Disabled: Story = {
  args: { disabled: true },
};

/**
 * Update the value dynamically after initial render
 */
export const WithDynamicValueAfterInitialRender: Story = {
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState('');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      setTimeout(() => {
        setValue('Apple');
      }, 1000);
    }, []);
    return <AutocompleteInput {...args} value={value} />;
  },
};
