import type { Meta, StoryObj } from '@storybook/react';
import { Controller, useForm } from 'react-hook-form';

import { SourceCode } from '@openops/shared';
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
    (Story, { args }) => {
      const form = useForm({
        defaultValues: {
          content: args.value,
        },
      });

      return (
        <div style={{ width: '600px' }}>
          <form>
            <Controller
              control={form.control}
              name="content"
              render={({ field }) => {
                // For JSON stories, display the object as formatted JSON string
                const displayValue = (args as any).parseJson
                  ? JSON.stringify(field.value, null, 2)
                  : field.value;

                return (
                  <Story
                    args={
                      {
                        ...args,
                        value: displayValue,
                        onChange: (value: unknown) => {
                          // Handle JSON string parsing if needed
                          if (
                            (args as any).parseJson &&
                            typeof value === 'string'
                          ) {
                            field.onChange(tryParseJson(value));
                          } else {
                            field.onChange(value);
                          }
                        },
                      } as any
                    }
                  />
                );
              }}
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
 * String input - shows a single editor without tabs
 */
export const StringInput: Story = {
  args: {
    value: 'echo "Hello World"',
    theme: 'light',
    readonly: false,
    showTabs: false,
  } as any,
};

/**
 * SourceCode object with tabs - shows Code and Dependencies tabs
 */
export const SourceCodeWithTabs: Story = {
  args: {
    value: {
      code: 'export const greeting = "Hello World!";\nconsole.log(greeting);',
      packageJson:
        '{\n  "name": "example",\n  "version": "1.0.0",\n  "dependencies": {\n    "lodash": "^4.17.21"\n  }\n}',
    } as SourceCode,
    theme: 'light',
    readonly: false,
    showTabs: true,
  } as any,
};

/**
 * JSON data as string - for backward compatibility with parsing
 */
export const JsonAsString: Story = {
  args: {
    value: {
      name: 'John Doe',
      age: 30,
      email: 'john.doe@example.com',
    },
    theme: 'light',
    readonly: false,
    showTabs: false,
    parseJson: true,
  } as any,
};
