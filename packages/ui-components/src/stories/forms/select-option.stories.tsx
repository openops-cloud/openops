import type { Meta, StoryObj } from '@storybook/react';
import {
  Cloud,
  Database,
  Globe,
  Heart,
  Lock,
  Server,
  Star,
} from 'lucide-react';

import { SelectForm, SelectOption } from '@/ui/select-form';

/**
 * Individual option component showcasing different icon and content variations
 */
const meta = {
  title: 'ui/Select Option',
  component: SelectOption,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <SelectForm type="single" defaultValue="">
          <Story />
        </SelectForm>
      </div>
    ),
  ],
} satisfies Meta<typeof SelectOption>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Basic option with text only
 */
export const Default: Story = {
  args: {
    value: 'default',
    children: 'Default Option',
  },
};

/**
 * Options with different service icons
 */
export const ServiceIcons: Story = {
  render: () => (
    <>
      <SelectOption
        value="database"
        icon={<Database className="h-4 w-4 text-green-500" />}
      >
        Database Service
      </SelectOption>
      <SelectOption
        value="server"
        icon={<Server className="h-4 w-4 text-blue-500" />}
      >
        Compute Service
      </SelectOption>
      <SelectOption
        value="storage"
        icon={<Globe className="h-4 w-4 text-purple-500" />}
      >
        Storage Service
      </SelectOption>
      <SelectOption
        value="security"
        icon={<Lock className="h-4 w-4 text-red-500" />}
      >
        Security Service
      </SelectOption>
    </>
  ),
};

/**
 * Options in different states
 */
export const DifferentStates: Story = {
  render: () => (
    <SelectForm type="single" defaultValue="selected">
      <SelectOption
        value="normal"
        icon={<Heart className="h-4 w-4 text-pink-500" />}
      >
        Normal State
      </SelectOption>
      <SelectOption
        value="selected"
        icon={<Star className="h-4 w-4 text-yellow-500" />}
      >
        Selected State
      </SelectOption>
      <SelectOption
        value="disabled"
        icon={<Lock className="h-4 w-4 text-gray-400" />}
        disabled
      >
        Disabled State
      </SelectOption>
    </SelectForm>
  ),
};

/**
 * Options without icons for comparison
 */
export const WithoutIcons: Story = {
  render: () => (
    <>
      <SelectOption value="option1">First Option</SelectOption>
      <SelectOption value="option2">Second Option</SelectOption>
      <SelectOption value="option3">Third Option</SelectOption>
    </>
  ),
};

/**
 * Different icon sizes and colors
 */
export const IconVariations: Story = {
  render: () => (
    <>
      <SelectOption
        value="small"
        icon={<Cloud className="h-3 w-3 text-blue-400" />}
      >
        Small Icon
      </SelectOption>
      <SelectOption
        value="normal"
        icon={<Cloud className="h-4 w-4 text-blue-500" />}
      >
        Normal Icon
      </SelectOption>
      <SelectOption
        value="large"
        icon={<Cloud className="h-5 w-5 text-blue-600" />}
      >
        Large Icon
      </SelectOption>
      <SelectOption
        value="colorful"
        icon={
          <div className="w-4 h-4 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full" />
        }
      >
        Custom Icon
      </SelectOption>
    </>
  ),
};
