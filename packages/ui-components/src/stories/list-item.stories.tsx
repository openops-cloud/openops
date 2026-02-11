import type { Meta, StoryObj } from '@storybook/react';

import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { ListItem } from '../ui/list-item';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

const meta = {
  title: 'ui/ListItem',
  component: ListItem,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    spacing: {
      control: 'select',
      options: ['compact', 'default', 'spacious'],
      description: 'Controls the spacing between child elements',
    },
    hasSeparator: {
      control: 'boolean',
      description: 'Whether to show a bottom border separator',
    },
  },
} satisfies Meta<typeof ListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <span className="w-4 h-4 bg-primary rounded-full" />
        <span>Default list item</span>
      </>
    ),
  },
};

export const WithSeparator: Story = {
  args: {
    hasSeparator: true,
    children: (
      <>
        <span className="w-4 h-4 bg-primary rounded-full" />
        <span>List item with separator</span>
      </>
    ),
  },
};

export const CompactSpacing: Story = {
  args: {
    spacing: 'compact',
    hasSeparator: true,
    children: (
      <>
        <span className="w-3 h-3 bg-primary rounded-full" />
        <span>Compact spacing</span>
      </>
    ),
  },
};

export const SpaciousSpacing: Story = {
  args: {
    spacing: 'spacious',
    hasSeparator: true,
    children: (
      <>
        <span className="w-5 h-5 bg-primary rounded-full" />
        <span>Spacious spacing</span>
      </>
    ),
  },
};

export const WithCheckbox: Story = {
  args: {
    hasSeparator: true,
    children: (
      <>
        <Checkbox id="example" />
        <Label htmlFor="example" className="cursor-pointer">
          Checkbox list item
        </Label>
      </>
    ),
  },
};

export const FormElements: Story = {
  render: () => (
    <div className="border border-border rounded-lg bg-background">
      <RadioGroup defaultValue="option1">
        <ListItem hasSeparator>
          <RadioGroupItem value="option1" id="option1" />
          <Label htmlFor="option1" className="cursor-pointer">
            Option 1
          </Label>
        </ListItem>
        <ListItem hasSeparator>
          <RadioGroupItem value="option2" id="option2" />
          <Label htmlFor="option2" className="cursor-pointer">
            Option 2
          </Label>
        </ListItem>
        <ListItem>
          <RadioGroupItem value="option3" id="option3" />
          <Label htmlFor="option3" className="cursor-pointer">
            Option 3
          </Label>
        </ListItem>
      </RadioGroup>
    </div>
  ),
};
