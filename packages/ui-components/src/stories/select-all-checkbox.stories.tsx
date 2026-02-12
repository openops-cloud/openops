import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { ListItem } from '../ui/list-item';
import { SelectAllCheckbox } from '../ui/select-all-checkbox';

const InteractiveExample = () => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4'];

  const allSelected = selectedItems.length === items.length;
  const someSelected =
    selectedItems.length > 0 && selectedItems.length < items.length;
  let selectAllState: boolean | 'indeterminate';
  if (allSelected) {
    selectAllState = true;
  } else if (someSelected) {
    selectAllState = 'indeterminate';
  } else {
    selectAllState = false;
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? items : []);
  };

  const handleItemToggle = (item: string) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  return (
    <div className="border border-border rounded-lg bg-background">
      <ListItem hasSeparator>
        <SelectAllCheckbox
          id="select-all-interactive"
          checked={selectAllState}
          onCheckedChange={handleSelectAll}
          label="Select all items"
        />
      </ListItem>

      {items.map((item, index) => (
        <ListItem key={item} hasSeparator={index < items.length - 1}>
          <Checkbox
            id={`item-${index}`}
            checked={selectedItems.includes(item)}
            onCheckedChange={() => handleItemToggle(item)}
            className="flex items-center justify-center rounded-xs data-[state=checked]:!bg-primary-200 data-[state=indeterminate]:!bg-primary-200 data-[state=checked]:!border-primary-200 data-[state=indeterminate]:!border-primary-200"
          />
          <Label htmlFor={`item-${index}`} className="cursor-pointer">
            {item}
          </Label>
        </ListItem>
      ))}
    </div>
  );
};

const meta = {
  title: 'ui/SelectAllCheckbox',
  component: SelectAllCheckbox,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    checked: {
      control: 'select',
      options: [true, false, 'indeterminate'],
      description: 'The checked state of the checkbox',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the checkbox is disabled',
    },
    label: {
      control: 'text',
      description: 'The label text for the checkbox',
    },
  },
} satisfies Meta<typeof SelectAllCheckbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'select-all-default',
    checked: false,
    label: 'Select all',
    onCheckedChange: () => {},
  },
};

export const Checked: Story = {
  args: {
    id: 'select-all-checked',
    checked: true,
    label: 'Select all',
    onCheckedChange: () => {},
  },
};

export const Indeterminate: Story = {
  args: {
    id: 'select-all-indeterminate',
    checked: 'indeterminate',
    label: 'Select all',
    onCheckedChange: () => {},
  },
};

export const Disabled: Story = {
  args: {
    id: 'select-all-disabled',
    checked: false,
    disabled: true,
    label: 'Select all (disabled)',
    onCheckedChange: () => {},
  },
};

export const Interactive: Story = {
  args: {
    id: 'select-all-interactive',
    checked: false,
    label: 'Select all items',
    onCheckedChange: () => {},
  },
  render: () => <InteractiveExample />,
};
