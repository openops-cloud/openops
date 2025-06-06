import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';
import { JsonViewer } from '../../components/json-viewer/json-viewer';

/**
 * Displays JSON data in a formatted, interactive viewer with options for copying, downloading, and editing.
 */
const meta = {
  title: 'components/JsonViewer',
  component: JsonViewer,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    json: {
      name: 'John Doe',
      age: 30,
      email: 'john.doe@example.com',
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
      },
      hobbies: ['reading', 'hiking', 'coding'],
    },
    title: 'User Information',
    readonly: true,
    theme: 'light',
  },
} satisfies Meta<typeof JsonViewer>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default view of the JSON viewer, displaying formatted JSON data in read-only mode.
 */
export const Default: Story = {};

/**
 * The JSON viewer in editable mode, allowing users to modify the JSON content.
 */
export const Editable: Story = {
  args: {
    readonly: false,
    onChange: action('Changed JSON'),
  },
};

/**
 * The JSON viewer with a complex nested JSON structure.
 */
export const ComplexJson: Story = {
  args: {
    json: {
      id: '12345',
      created_at: '2023-01-01T12:00:00Z',
      user: {
        id: 'user_789',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        settings: {
          notifications: {
            email: true,
            push: false,
            sms: true,
          },
          theme: 'dark',
          language: 'en-US',
        },
      },
      items: [
        {
          id: 'item_1',
          name: 'Product A',
          price: 19.99,
          quantity: 2,
        },
        {
          id: 'item_2',
          name: 'Product B',
          price: 29.99,
          quantity: 1,
        },
        {
          id: 'item_3',
          name: 'Product C',
          price: 9.99,
          quantity: 5,
        },
      ],
      total: 109.92,
      status: 'completed',
    },
    title: 'Complex JSON Example',
  },
};

/**
 * The JSON viewer with an empty JSON object.
 */
export const EmptyJson: Story = {
  args: {
    json: {},
    title: 'Empty JSON',
  },
};

/**
 * The JSON viewer displaying a file URL with a download button.
 */
export const FileButton: Story = {
  args: {
    json: 'file://path/to/example.json',
    title: 'File Download Example',
  },
};

/**
 * The JSON viewer with file URLs embedded within the JSON object.
 * This demonstrates the functionality of the useLayoutEffect hook that
 * transforms file URLs within JSON objects into FileButton components.
 */
export const EmbeddedFileUrls: Story = {
  args: {
    json: {
      name: 'Document Collection',
      files: {
        document1: 'file://path/to/document1.pdf',
        document2: 'file://path/to/document2.docx',
      },
      nestedFiles: {
        folder1: {
          file1: 'file://path/to/nested/file1.txt',
        },
      },
      fileArray: [
        'file://path/to/array/file1.json',
        'file://path/to/array/file2.json',
      ],
    },
    title: 'Embedded File URLs Example',
  },
};

/**
 * The JSON viewer displaying a file write result object.
 * This demonstrates how the JsonViewer displays the result of a file write operation,
 * similar to what is returned by context.files.write() in blocks.
 */
export const FileWriteResult: Story = {
  args: {
    json: {
      file: 'file://path/to/example.txt',
    },
    title: 'File Write Result Example',
  },
};
