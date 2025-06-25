import type { Meta, StoryObj } from '@storybook/react';
import { Controller, useForm } from 'react-hook-form';

import { CodeMirrorEditor } from '../../components/json-editor';
import { tryParseJson } from '../../lib/json-utils';

/**
 * A JSON editor component that provides syntax highlighting, validation, and editing capabilities for JSON data.
 */
const meta = {
  title: 'components/CodeMirrorEditor',
  component: CodeMirrorEditor,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => {
      const form = useForm({
        defaultValues: {
          jsonContent: {
            name: 'John Doe',
            age: 30,
            email: 'john.doe@example.com',
          },
        },
      });

      return (
        <div style={{ width: '600px' }}>
          <form>
            <Controller
              control={form.control}
              name="jsonContent"
              render={({ field }) => (
                <Story
                  args={
                    {
                      value: field.value,
                      onChange: (value: string) =>
                        field.onChange(tryParseJson(value)),
                    } as any
                  }
                />
              )}
            />
          </form>
        </div>
      );
    },
  ],
} satisfies Meta<typeof CodeMirrorEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default view of the JSON editor, allowing users to edit JSON content with syntax highlighting.
 */
export const Default: Story = {
  args: {
    readonly: false,
  } as any,
};

/**
 * The JSON editor with complex nested JSON data.
 */
export const ComplexJson: Story = {
  args: {} as any,
  decorators: [
    (Story) => {
      const form = useForm({
        defaultValues: {
          jsonContent: {
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
            ],
            total: 69.97,
            status: 'completed',
          },
        },
      });

      return (
        <div style={{ width: '600px' }}>
          <form>
            <Controller
              control={form.control}
              name="jsonContent"
              render={({ field }) => (
                <Story
                  args={
                    {
                      value: field.value,
                      onChange: (value: string) =>
                        field.onChange(tryParseJson(value)),
                      readonly: false,
                    } as any
                  }
                />
              )}
            />
          </form>
        </div>
      );
    },
  ],
};
