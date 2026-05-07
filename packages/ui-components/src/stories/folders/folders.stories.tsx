import type { Meta, StoryObj } from '@storybook/react-vite';
import { Decorator } from '@storybook/react-vite';
import { Ellipsis } from 'lucide-react';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, fireEvent, fn, userEvent, waitFor } from 'storybook/test';
import { FileAddons } from '../../components/folder-tree/file-addons';
import { FolderAddons } from '../../components/folder-tree/folder-addons';
import { FolderTree } from '../../components/folder-tree/folder-tree';
import { selectLightOrDarkCanvas } from '../../test-utils/select-themed-canvas.util';
import { TooltipProvider } from '../../ui/tooltip';
import { sampleFolderData } from './sample-data';

const withMemoryRouter: Decorator = (Story, context) => (
  <MemoryRouter initialEntries={['/']}>
    <Routes>
      <Route
        path="/"
        element={
          <TooltipProvider>
            <Story {...context} />
          </TooltipProvider>
        }
      />
    </Routes>
  </MemoryRouter>
);

const meta = {
  title: 'components/Folders',
  component: FolderTree,
  tags: ['autodocs'],
  decorators: [withMemoryRouter],
  argTypes: {
    onItemClick: {
      description: 'function to handle the selection of a node',
    },
    onFolderClick: {
      description: 'function to handle the selection of a folder',
    },
    className: {
      description: 'className to apply to the root div',
    },
    folderAddons: {
      description: 'custom React component for addons',
    },
  },
  args: {
    className: 'max-w-80',
    onItemClick: fn(),
    onFolderClick: fn(),
    folderItems: sampleFolderData,
  },
  parameters: {
    layout: 'centered',
    docs: {
      story: {
        autoplay: true,
      },
    },
  },
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
      new Set(),
    );

    return (
      <TooltipProvider>
        <FolderTree
          {...args}
          expandedFolders={expandedFolders}
          setExpandedFolders={setExpandedFolders}
        />
      </TooltipProvider>
    );
  },
} satisfies Meta<typeof FolderTree>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Displays a folder structure
 */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    // eslint-disable-next-line testing-library/no-node-access
    const folderTree = await canvas.findByRole('tree');

    expect(folderTree).toBeInTheDocument();

    // expand the first folder
    const firstFolder = await canvas.findByText('New folder');
    fireEvent.click(firstFolder);

    expect(args.onFolderClick).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'New folder' }),
    );

    expect(await canvas.findByText('subfolder')).toBeVisible();

    // expand the subfolder
    const subfolder = await canvas.findByText('subfolder');
    fireEvent.click(subfolder);

    expect(args.onFolderClick).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'subfolder' }),
    );

    expect(await canvas.findByText('subfolder flow')).toBeVisible();

    // click subflow
    const subflow = await canvas.findByText('subfolder flow');
    fireEvent.click(subflow);

    expect(args.onItemClick).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: 'subfolder flow',
      }),
    );

    // collapse all
    fireEvent.click(subfolder);
    fireEvent.click(firstFolder);

    expect(args.onFolderClick).toHaveBeenCalledTimes(4);
    await waitFor(() => {
      expect(canvas.queryByText('subfolder')).not.toBeInTheDocument();
    });
  },
};

/**
 * Displays all folders expanded
 */
export const WithAllExpanded: Story = {
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
      new Set([
        'NULL',
        'F7egxEO3XnAiTmUxelpwu',
        'hsYQIvK4BZJaASG5ysFFb',
        'WKX0hIuccEBWHRfyrmHET',
      ]),
    );
    return (
      <TooltipProvider>
        <FolderTree
          {...args}
          expandedFolders={expandedFolders}
          setExpandedFolders={setExpandedFolders}
          onItemClick={args.onItemClick}
        />
      </TooltipProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);

    expect(await canvas.findByText('subfolder flow')).toBeVisible();
    expect(await canvas.findByText('sub-sub flow')).toBeVisible();
  },
};

/**
 * Displays a selected item
 */
export const WithSelectedItem: Story = {
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
      new Set(['F7egxEO3XnAiTmUxelpwu']),
    );

    return (
      <TooltipProvider>
        <FolderTree
          {...args}
          expandedFolders={expandedFolders}
          setExpandedFolders={setExpandedFolders}
          onItemClick={args.onItemClick}
          selectedItemId="uRb1w7WYjICkRehMPROtk"
        />
      </TooltipProvider>
    );
  },
};

/**
 * Displays a folder structure with long text
 */
export const WithTextOverflow: Story = {
  args: {
    className: 'max-w-56',
  },
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
      new Set(['F7egxEO3XnAiTmUxelpwu']),
    );
    return (
      <TooltipProvider>
        <FolderTree
          {...args}
          folderItems={[
            {
              id: 'F7egxEO3XnAiTmUxelpwu',
              displayName:
                'Some very long folder name that should be truncated',
              type: 'folder',
              itemCount: 4,
              children: [
                {
                  id: 'uRb1w7WYjICkRehMPROtk',
                  displayName:
                    'AWS remediation on staging -> Bulk idle EBS cleanup',
                  type: 'item',
                },
                {
                  id: 'tzrR7yZqcG5g3KGzbuRrj',
                  displayName: 'Simple workflow name ',
                  type: 'item',
                },
              ],
            },
          ]}
          expandedFolders={expandedFolders}
          setExpandedFolders={setExpandedFolders}
          onItemClick={args.onItemClick}
          selectedItemId="uRb1w7WYjICkRehMPROtk"
        />
      </TooltipProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    const folderName = 'Some very long folder name that should be truncated';

    const folder = await canvas.findByText(folderName);
    await userEvent.hover(folder);
    await canvas.findByText(folderName);
  },
};

/**
 * Displays a folder structure with folder addons
 */
export const WithFolderAddons: Story = {
  parameters: {
    chromatic: { disable: true },
    onMoreActionsClick: fn(),
    onAddItemClick: fn(),
  },
  render: (args, { parameters }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
      new Set(['F7egxEO3XnAiTmUxelpwu']),
    );
    return (
      <TooltipProvider>
        <FolderTree
          {...args}
          expandedFolders={expandedFolders}
          setExpandedFolders={setExpandedFolders}
          folderAddons={(item) => (
            <FolderAddons
              item={item}
              onAddItemClick={() => parameters.onAddItemClick(item)}
              moreActions={
                <Ellipsis
                  role="button"
                  data-testid="more-actions"
                  onClick={() => parameters.onMoreActionsClick(item)}
                  className="h-5 w-5"
                />
              }
            />
          )}
        />
      </TooltipProvider>
    );
  },
  play: async ({ canvasElement, parameters }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    const folderTrigger = (
      await canvas.findAllByTestId('collapsible-folder-trigger')
    )[0];

    await userEvent.hover(folderTrigger);

    expect((await canvas.findAllByTestId('add-flow'))[0]).toBeInTheDocument();
    expect(
      (await canvas.findAllByTestId('more-actions'))[0],
    ).toBeInTheDocument();

    await testButtonClick({
      canvas,
      testId: 'add-flow',
      parameters,
      handlerName: 'onAddItemClick',
      expectedDisplayName: 'Uncategorized',
    });

    await testButtonClick({
      canvas,
      testId: 'more-actions',
      parameters,
      handlerName: 'onMoreActionsClick',
      expectedDisplayName: 'Uncategorized',
    });
  },
};

/**
 * Displays a folder structure with folder and file addons
 */
export const WithFileAddons: Story = {
  parameters: {
    chromatic: { disable: true },
    onMoreActionsClick: fn(),
    onAddItemClick: fn(),
    onViewClick: fn(),
    onEditClick: fn(),
  },
  render: (args, { parameters }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
      new Set(['NULL']),
    );
    return (
      <TooltipProvider>
        <FolderTree
          {...args}
          expandedFolders={expandedFolders}
          setExpandedFolders={setExpandedFolders}
          selectedItemId={'flow2'}
          fileAddons={(item) => (
            <FileAddons
              item={item}
              isSelected={item.id === 'flow2'}
              readonly={false}
              onViewClick={parameters.onViewClick}
              onEditClick={parameters.onEditClick}
            />
          )}
          folderAddons={(item) => (
            <FolderAddons
              item={item}
              onAddItemClick={parameters.onAddItemClick}
              moreActions={
                <Ellipsis
                  role="button"
                  data-testid="more-actions"
                  onClick={parameters.onMoreActionsClick}
                  className="h-5 w-5"
                />
              }
            />
          )}
        />
      </TooltipProvider>
    );
  },
  play: async ({ canvasElement, parameters }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    const folderTrigger = (await canvas.findAllByTestId('folder-item'))[0];
    await userEvent.hover(folderTrigger);
    expect((await canvas.findAllByTestId('view-flow'))[0]).toBeInTheDocument();
    expect((await canvas.findAllByTestId('edit-flow'))[0]).toBeInTheDocument();

    await testButtonClick({
      canvas,
      testId: 'view-flow',
      parameters,
      handlerName: 'onViewClick',
      expectedDisplayName: 'Uncategorized Flow 1',
    });

    await testButtonClick({
      canvas,
      testId: 'edit-flow',
      parameters,
      handlerName: 'onEditClick',
      expectedDisplayName: 'Uncategorized Flow 1',
    });
  },
};

async function testButtonClick({
  canvas,
  testId,
  parameters,
  handlerName,
  expectedDisplayName,
  index = 0,
}: {
  canvas: ReturnType<typeof selectLightOrDarkCanvas>;
  testId: string;
  parameters: Record<string, any>;
  handlerName: string;
  expectedDisplayName: string;
  index?: number;
}) {
  const button = (await canvas.findAllByTestId(testId))[index];
  await userEvent.click(button);

  expect(parameters[handlerName]).toHaveBeenCalledTimes(1);
  expect(parameters[handlerName]).toHaveBeenCalledWith(
    expect.objectContaining({ displayName: expectedDisplayName }),
  );
}
