import type { Meta, StoryObj } from '@storybook/react-vite';
import { BrowserRouter } from 'react-router-dom';
import { expect, waitFor } from 'storybook/test';

import { DataTable } from '@/ui/data-table';
import { ScrollArea } from '@/ui/scroll-area';
import { RunsIcon } from '../icons';
import { selectLightOrDarkCanvas } from '../test-utils/select-themed-canvas.util';

const columns = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'age',
    header: 'Age',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
];

const defaultData = [
  { name: 'John Doe', age: 30, email: 'john@doe.com' },
  { name: 'Jane Doe', age: 25, email: 'jane@doe.com' },
  { name: 'Bob Smith', age: 35, email: 'bob@smith.com' },
  { name: 'Alice Johnson', age: 40, email: 'alice@johnson.com' },
  { name: 'Bob Williams', age: 28, email: 'bob@williams.com' },
  { name: 'Charlie Brown', age: 22, email: 'charlie@brown.com' },
  { name: 'David Jones', age: 36, email: 'david@jones.com' },
  { name: 'Emily Miller', age: 39, email: 'emily@miller.com' },
  { name: 'Frank Adams', age: 26, email: 'frank@adams.com' },
  { name: 'Grace Thompson', age: 32, email: 'grace@thompson.com' },
];

const meta: Meta<typeof DataTable> = {
  title: 'ui/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  argTypes: {
    columns: {
      control: false,
    },
    data: {
      control: false,
    },
    loading: {
      control: { type: 'boolean' },
    },
  },
  render: (args) => (
    <BrowserRouter>
      <DataTable
        columns={columns}
        data={defaultData}
        loading={false}
        {...args}
      ></DataTable>
    </BrowserRouter>
  ),
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    loading: false,
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const DefaultEmpty: Story = {
  args: {
    loading: false,
    data: [],
  },
};

export const CustomEmptyComponent: Story = {
  args: {
    loading: false,
    data: [],
    emptyStateComponent: (
      <div className="flex flex-col items-center justify-center gap-1 my-12">
        <RunsIcon className="mb-2" />
        <p className="font-semibold">No runs yet</p>
        <p className="max-w-60">
          Create and publish the flows to see them in action.
        </p>
      </div>
    ),
  },
};

export const WithFetcher: Story = {
  args: {
    loading: undefined,
    data: undefined,
    fetchData: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        data: defaultData,
      };
    },
  },
  parameters: {
    chromatic: { disable: true },
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);

    const skeleton = canvas.getByRole('progressbar');
    expect(skeleton).toBeVisible();

    await waitFor(() => {
      const tableRow = canvas.getByText(defaultData[0].name);
      expect(tableRow).toBeVisible();
    });
  },
};

export const MutedBackground: Story = {
  args: {
    loading: false,
    cellClassName: 'bg-muted',
  },
};

export const StickyHeader: Story = {
  args: {
    loading: false,
    stickyHeader: true,
    border: false,
  },
  render: (args: any) => (
    <BrowserRouter>
      <ScrollArea className="h-72 w-full rounded-md border" type="always">
        <DataTable columns={columns} data={defaultData} {...args} />
      </ScrollArea>
    </BrowserRouter>
  ),
};
