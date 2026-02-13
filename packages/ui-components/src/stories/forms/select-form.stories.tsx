/* eslint-disable react-hooks/rules-of-hooks */
import type { Meta, StoryObj } from '@storybook/react';
import { Cloud, Database, Globe, Lock, Server } from 'lucide-react';
import { useState } from 'react';

import { SelectForm, SelectOption } from '@/ui/select-form';

/**
 * Form components for single and multi-selection with optional icons and labels.
 */
const meta = {
  title: 'ui/Select Form',
  component: SelectForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof SelectForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Single selection form matching the AWS connection picker from Figma
 */
export const SingleSelect: Story = {
  render: () => {
    const [value, setValue] = useState('');

    return (
      <div className="w-[440px]">
        <SelectForm type="single" value={value} onValueChange={setValue}>
          <SelectOption
            value="aws-prod"
            icon={<Cloud className="h-4 w-4 text-orange-500" />}
          >
            AWS - Production
          </SelectOption>
          <SelectOption
            value="aws-billing"
            icon={<Cloud className="h-4 w-4 text-orange-500" />}
          >
            AWS - Billing
          </SelectOption>
          <SelectOption
            value="aws-readonly"
            icon={<Cloud className="h-4 w-4 text-orange-500" />}
          >
            AWS - Read only
          </SelectOption>
          <SelectOption
            value="aws-sandbox"
            icon={<Cloud className="h-4 w-4 text-orange-500" />}
          >
            AWS - Sandbox
          </SelectOption>
          <SelectOption
            value="aws-platform"
            icon={<Cloud className="h-4 w-4 text-orange-500" />}
          >
            AWS - Platform Team
          </SelectOption>
        </SelectForm>
        <div className="mt-4 p-3 bg-muted rounded text-sm dark:text-foreground">
          Selected: <code>{value || 'None'}</code>
        </div>
      </div>
    );
  },
};

/**
 * Multi-selection form for choosing multiple options
 */
export const MultiSelect: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);

    return (
      <div className="w-[440px]">
        <SelectForm type="multi" value={value} onValueChange={setValue}>
          <SelectOption
            value="monitoring"
            icon={<Globe className="h-4 w-4 text-blue-500" />}
          >
            Monitoring & Alerts
          </SelectOption>
          <SelectOption
            value="database"
            icon={<Database className="h-4 w-4 text-green-500" />}
          >
            Database Management
          </SelectOption>
          <SelectOption
            value="security"
            icon={<Lock className="h-4 w-4 text-red-500" />}
          >
            Security & Compliance
          </SelectOption>
          <SelectOption
            value="compute"
            icon={<Server className="h-4 w-4 text-purple-500" />}
          >
            Compute Resources
          </SelectOption>
          <SelectOption
            value="storage"
            icon={<Database className="h-4 w-4 text-yellow-500" />}
          >
            Storage & Backup
          </SelectOption>
        </SelectForm>
        <div className="mt-4 p-3 bg-muted rounded text-sm dark:text-foreground">
          Selected: <code>{value.length > 0 ? value.join(', ') : 'None'}</code>
        </div>
      </div>
    );
  },
};

/**
 * Single select form without icons
 */
export const WithoutIcons: Story = {
  render: () => {
    const [value, setValue] = useState('');

    return (
      <div className="w-[400px]">
        <SelectForm type="single" value={value} onValueChange={setValue}>
          <SelectOption value="option1">First Option</SelectOption>
          <SelectOption value="option2">Second Option</SelectOption>
          <SelectOption value="option3">Third Option</SelectOption>
          <SelectOption value="option4">Fourth Option</SelectOption>
        </SelectForm>
        <div className="mt-4 p-3 bg-muted rounded text-sm dark:text-foreground">
          Selected: <code>{value || 'None'}</code>
        </div>
      </div>
    );
  },
};

/**
 * Disabled form state
 */
export const Disabled: Story = {
  render: () => {
    return (
      <div className="w-[400px]">
        <SelectForm type="single" disabled defaultValue="option2">
          <SelectOption value="option1" icon={<Server className="h-4 w-4" />}>
            First Option
          </SelectOption>
          <SelectOption value="option2" icon={<Database className="h-4 w-4" />}>
            Second Option (Selected)
          </SelectOption>
          <SelectOption value="option3" icon={<Globe className="h-4 w-4" />}>
            Third Option
          </SelectOption>
        </SelectForm>
      </div>
    );
  },
};

/**
 * Compact form with fewer options
 */
export const Compact: Story = {
  render: () => {
    const [value, setValue] = useState('yes');

    return (
      <div className="w-[300px]">
        <SelectForm type="single" value={value} onValueChange={setValue}>
          <SelectOption value="yes">Yes, enable this feature</SelectOption>
          <SelectOption value="no">No, keep disabled</SelectOption>
        </SelectForm>
        <div className="mt-4 p-3 bg-muted rounded text-sm dark:text-foreground">
          Selected: <code>{value}</code>
        </div>
      </div>
    );
  },
};

/**
 * Long list demonstrating scrollable behavior
 */
export const LongList: Story = {
  render: () => {
    const [value, setValue] = useState<string[]>([]);

    return (
      <div className="w-[400px] h-[400px]">
        <div className="h-full overflow-auto">
          <SelectForm type="multi" value={value} onValueChange={setValue}>
            {Array.from({ length: 15 }, (_, i) => (
              <SelectOption
                key={i}
                value={`option-${i + 1}`}
                icon={<Server className="h-4 w-4 text-blue-500" />}
              >
                Option {i + 1} -{' '}
                {
                  ['Production', 'Development', 'Staging', 'Testing', 'Demo'][
                    i % 5
                  ]
                }{' '}
                Environment
              </SelectOption>
            ))}
          </SelectForm>
        </div>
        <div className="mt-4 p-3 bg-muted rounded text-sm">
          Selected {value.length} items:{' '}
          <code>
            {value.slice(0, 3).join(', ')}
            {value.length > 3 ? '...' : ''}
          </code>
        </div>
      </div>
    );
  },
};

/**
 * Pre-selected values
 */
export const PreSelected: Story = {
  render: () => {
    const [singleValue, setSingleValue] = useState('aws-prod');
    const [multiValue, setMultiValue] = useState(['monitoring', 'security']);

    return (
      <div className="space-y-6 w-[440px]">
        <div>
          <h4 className="text-sm font-medium mb-3">
            Single Select (Pre-selected)
          </h4>
          <SelectForm
            type="single"
            value={singleValue}
            onValueChange={setSingleValue}
          >
            <SelectOption
              value="aws-prod"
              icon={<Cloud className="h-4 w-4 text-orange-500" />}
            >
              AWS - Production
            </SelectOption>
            <SelectOption
              value="aws-staging"
              icon={<Cloud className="h-4 w-4 text-orange-500" />}
            >
              AWS - Staging
            </SelectOption>
          </SelectForm>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-3">
            Multi Select (Pre-selected)
          </h4>
          <SelectForm
            type="multi"
            value={multiValue}
            onValueChange={setMultiValue}
          >
            <SelectOption
              value="monitoring"
              icon={<Globe className="h-4 w-4 text-blue-500" />}
            >
              Monitoring & Alerts
            </SelectOption>
            <SelectOption
              value="database"
              icon={<Database className="h-4 w-4 text-green-500" />}
            >
              Database Management
            </SelectOption>
            <SelectOption
              value="security"
              icon={<Lock className="h-4 w-4 text-red-500" />}
            >
              Security & Compliance
            </SelectOption>
          </SelectForm>
        </div>
      </div>
    );
  },
};
