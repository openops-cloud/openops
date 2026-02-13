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

export const WithCheckbox: Story = {
  args: {
    hasSeparator: true,
    className: 'border bg-background',
    children: (
      <>
        <Checkbox id="example" />
        <Label
          htmlFor="example"
          className="cursor-pointer dark:text-foreground"
        >
          Checkbox list item
        </Label>
      </>
    ),
  },
};

export const WithRadio: Story = {
  args: {
    hasSeparator: true,
    children: <span>Radio content</span>, // This will be overridden in render
  },
  render: (args) => (
    <div className="border bg-background">
      <RadioGroup defaultValue="radio-example">
        <ListItem {...args}>
          <RadioGroupItem value="radio-example" id="radio-example" />
          <Label
            htmlFor="radio-example"
            className="cursor-pointer dark:text-foreground"
          >
            Radio list item
          </Label>
        </ListItem>
      </RadioGroup>
    </div>
  ),
};

export const FormElements: Story = {
  args: {
    children: <span>Form elements container</span>,
  },
  render: () => (
    <div className="border border-border rounded-lg bg-background">
      <RadioGroup defaultValue="option1">
        <ListItem hasSeparator>
          <RadioGroupItem value="option1" id="option1" />
          <Label
            htmlFor="option1"
            className="cursor-pointer dark:text-foreground"
          >
            Option 1
          </Label>
        </ListItem>
        <ListItem hasSeparator>
          <RadioGroupItem value="option2" id="option2" />
          <Label
            htmlFor="option2"
            className="cursor-pointer dark:text-foreground"
          >
            Option 2
          </Label>
        </ListItem>
        <ListItem>
          <RadioGroupItem value="option3" id="option3" />
          <Label
            htmlFor="option3"
            className="cursor-pointer dark:text-foreground"
          >
            Option 3
          </Label>
        </ListItem>
      </RadioGroup>
    </div>
  ),
};
