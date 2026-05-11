import { UNCATEGORIZED_FOLDER_ID } from '@openops/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { FolderBreadcrumbs } from '../../components/folder-breadcrumbs/folder-breadcrumbs';
import { selectLightOrDarkCanvas } from '../../test-utils/select-themed-canvas.util';
import { generateDeeplyNestedFolder } from './sample-data';

const meta = {
  title: 'components/FolderBreadcrumbs',
  component: FolderBreadcrumbs,
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    expect(canvas.getByTestId('folder-breadcrumbs')).toBeInTheDocument();
  },
  decorators: [
    (Story) => (
      <div className="bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FolderBreadcrumbs>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Typical
 */
export const Typical: Story = {
  args: {
    folderItems: [generateDeeplyNestedFolder(3)],
    selectedFolderId: 'level-3',
  },
};

/**
 * With undefined folder items
 */
export const WithUndefinedFolderItems: Story = {
  parameters: {
    chromatic: { disable: true },
  },
  argTypes: {
    folderItems: {
      control: false,
    },
  },
  args: {
    folderItems: undefined,
    selectedFolderId: UNCATEGORIZED_FOLDER_ID,
  },
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    expect(canvas.queryByTestId('folder-breadcrumbs')).not.toBeInTheDocument();
  },
};

/**
 * Folder items collection is empty
 */
export const WithEmptyFolderItemsCollection: Story = {
  parameters: {
    chromatic: { disable: true },
  },
  argTypes: {
    folderItems: {
      control: false,
    },
  },
  args: {
    folderItems: [],
    selectedFolderId: UNCATEGORIZED_FOLDER_ID,
  },
  play: async ({ canvasElement }) => {
    const canvas = selectLightOrDarkCanvas(canvasElement);
    expect(canvas.queryByTestId('folder-breadcrumbs')).not.toBeInTheDocument();
  },
};

/**
 * Uncategorized folder is a top-level folder without subfolders
 */
export const Uncategorized: Story = {
  args: {
    folderItems: [generateDeeplyNestedFolder(3)],
    selectedFolderId: UNCATEGORIZED_FOLDER_ID,
  },
};

/**
 * DeeplyNested selected folder, 10 levels deep
 */
export const DeeplyNested: Story = {
  args: {
    folderItems: [generateDeeplyNestedFolder(10)],
    selectedFolderId: 'level-10',
  },
};

/**
 * Showcases maximum width for each path token
 */
export const LongPathTokens: Story = {
  args: {
    folderItems: [generateDeeplyNestedFolder(10, 'Lorem ipsum dolor sit amet')],
    selectedFolderId: 'level-10',
  },
};
