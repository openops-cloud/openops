import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  NestedMultiSelect,
  NestedOption,
} from '../components/nested-multi-select';

const meta = {
  title: 'Components/NestedMultiSelect',
  component: NestedMultiSelect,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof NestedMultiSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

const cloudProviderOptions: NestedOption[] = [
  {
    id: 'aws',
    displayName: 'AWS',
    imageLogoUrl: '/blocks/aws.png',
    items: [
      { id: 'ec2', displayName: 'EC2' },
      { id: 'ec2-asg', displayName: 'EC2 Auto Scaling Group' },
      { id: 'ebs', displayName: 'EBS' },
      { id: 's3', displayName: 'S3' },
      { id: 'rds', displayName: 'RDS' },
      { id: 'lambda', displayName: 'Lambda' },
    ],
  },
  {
    id: 'azure',
    displayName: 'Azure',
    imageLogoUrl: '/blocks/azure.svg',
    items: [
      { id: 'vm', displayName: 'Virtual Machines' },
      { id: 'disk', displayName: 'Managed Disks' },
      { id: 'sql', displayName: 'SQL Database' },
    ],
  },
  {
    id: 'gcp',
    displayName: 'GCP',
    imageLogoUrl: '/blocks/google-cloud.svg',
    items: [
      { id: 'compute', displayName: 'Compute Engine' },
      { id: 'storage', displayName: 'Cloud Storage' },
      { id: 'sql', displayName: 'Cloud SQL' },
    ],
  },
];

const simpleOptions: NestedOption[] = [
  {
    id: 'fruits',
    displayName: 'Fruits',
    items: [
      { id: 'apple', displayName: 'Apple' },
      { id: 'banana', displayName: 'Banana' },
      { id: 'orange', displayName: 'Orange' },
    ],
  },
  {
    id: 'vegetables',
    displayName: 'Vegetables',
    items: [
      { id: 'carrot', displayName: 'Carrot' },
      { id: 'broccoli', displayName: 'Broccoli' },
    ],
  },
];

function NestedMultiSelectWithState({
  options,
}: Readonly<{ options: NestedOption[] }>) {
  const [value, setValue] = useState<Record<string, string[]>>({});

  return (
    <div className="w-[600px]">
      <NestedMultiSelect
        options={options}
        value={value}
        onValueChange={setValue}
      />
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p className="text-sm font-semibold mb-2">Selected:</p>
        <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}

export const CloudProviders: Story = {
  render: () => <NestedMultiSelectWithState options={cloudProviderOptions} />,
};

export const SimpleExample: Story = {
  render: () => <NestedMultiSelectWithState options={simpleOptions} />,
};

function PreselectedExample() {
  const [value, setValue] = useState<Record<string, string[]>>({
    aws: ['ec2', 's3'],
    azure: ['vm'],
  });

  return (
    <div className="w-[600px]">
      <NestedMultiSelect
        options={cloudProviderOptions}
        value={value}
        onValueChange={setValue}
      />
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p className="text-sm font-semibold mb-2">Selected:</p>
        <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}

export const WithPreselection: Story = {
  render: () => <PreselectedExample />,
};

function AllSelectedExample() {
  const [value, setValue] = useState<Record<string, string[]>>({
    aws: ['ec2', 'ec2-asg', 'ebs', 's3', 'rds', 'lambda'],
    azure: ['vm', 'disk', 'sql'],
    gcp: ['compute', 'storage', 'sql'],
  });

  return (
    <div className="w-[600px]">
      <NestedMultiSelect
        options={cloudProviderOptions}
        value={value}
        onValueChange={setValue}
      />
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p className="text-sm font-semibold mb-2">Selected:</p>
        <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
      </div>
    </div>
  );
}

export const AllSelected: Story = {
  render: () => <AllSelectedExample />,
};

export const EmptyOptions: Story = {
  render: () => <NestedMultiSelectWithState options={[]} />,
};
