import type { Meta, StoryObj } from '@storybook/react';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { useState } from 'react';

import { cn } from '../lib/cn';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import {
  SelectAllCheckbox,
  type SelectAllChangeAction,
} from '../ui/select-all-checkbox';

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

const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4'];

const InteractiveExample = () => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleSelectAllChange = (action: SelectAllChangeAction) => {
    setSelectedItems(action === 'selectAll' ? items : []);
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
          selectedCount={selectedItems.length}
          totalCount={items.length}
          onSelectAllChange={handleSelectAllChange}
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
    selectedCount: {
      control: 'number',
      description: 'Number of currently selected items',
    },
    totalCount: {
      control: 'number',
      description: 'Total number of items',
    },
    variant: {
      control: 'select',
      options: ['default', 'primary'],
      description: 'Checkbox color variant',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the checkbox is disabled',
    },
  },
} satisfies Meta<typeof SelectAllCheckbox>;

export default meta;

type Story = StoryObj<typeof meta>;

const backgroundClass = 'bg-background p-6';

export const NoneSelected: Story = {
  args: {
    id: 'select-all-none',
    className: backgroundClass,
    selectedCount: 0,
    totalCount: 5,
    onSelectAllChange: () => {},
  },
};

export const AllSelected: Story = {
  args: {
    id: 'select-all-all',
    className: backgroundClass,
    selectedCount: 5,
    totalCount: 5,
    onSelectAllChange: () => {},
  },
};

export const SomeSelected: Story = {
  args: {
    id: 'select-all-some',
    className: backgroundClass,
    selectedCount: 3,
    totalCount: 5,
    onSelectAllChange: () => {},
  },
};

export const Disabled: Story = {
  args: {
    id: 'select-all-disabled',
    className: backgroundClass,
    selectedCount: 0,
    totalCount: 5,
    disabled: true,
    onSelectAllChange: () => {},
  },
};

export const DefaultVariant: Story = {
  args: {
    id: 'select-all-default-variant',
    className: backgroundClass,
    selectedCount: 3,
    totalCount: 5,
    variant: 'default',
    onSelectAllChange: () => {},
  },
};

export const Interactive: Story = {
  args: {
    id: 'select-all-interactive',
    selectedCount: 0,
    totalCount: 4,
    onSelectAllChange: () => {},
  },
  render: () => <InteractiveExample />,
};
