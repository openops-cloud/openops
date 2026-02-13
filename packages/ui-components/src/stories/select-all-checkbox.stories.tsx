import type { Meta, StoryObj } from '@storybook/react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { useState } from 'react';

import { cn } from '../lib/cn';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { SelectAllCheckbox } from '../ui/select-all-checkbox';

const listItemVariants = cva('flex items-center px-4 py-3 min-h-[49px]', {
  variants: {
    spacing: {
      compact: 'space-x-2',
      default: 'space-x-4',
      spacious: 'space-x-6',
    },
    hasSeparator: {
      true: 'border-b border-border',
      false: '',
    },
  },
  defaultVariants: {
    spacing: 'default',
    hasSeparator: false,
  },
});

interface ListItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof listItemVariants> {
  children: React.ReactNode;
}

const ListItem = React.forwardRef<HTMLDivElement, ListItemProps>(
  ({ className, children, spacing, hasSeparator, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(listItemVariants({ spacing, hasSeparator }), className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

ListItem.displayName = 'ListItem';

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
          <Label
            htmlFor={`item-${index}`}
            className="cursor-pointer dark:text-foreground"
          >
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

const backgroundClass = 'bg-background p-6';

export const Default: Story = {
  args: {
    id: 'select-all-default',
    className: backgroundClass,
    checked: false,
    label: 'Select all',
    onCheckedChange: () => {},
  },
};

export const Checked: Story = {
  args: {
    id: 'select-all-checked',
    className: backgroundClass,
    checked: true,
    label: 'Select all',
    onCheckedChange: () => {},
  },
};

export const Indeterminate: Story = {
  args: {
    id: 'select-all-indeterminate',
    className: backgroundClass,
    checked: 'indeterminate',
    label: 'Select all',
    onCheckedChange: () => {},
  },
};

export const Disabled: Story = {
  args: {
    id: 'select-all-disabled',
    className: backgroundClass,
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
