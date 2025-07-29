import type { Meta, StoryObj } from '@storybook/react';
import { Controller, useForm } from 'react-hook-form';

import { SourceCode } from '@openops/shared';
import { ThemeAwareContainer } from '../../../.storybook/decorators';
import { CodeEditor } from '../../components/code-editor';

/**
 * A Monaco-based code editor component that provides syntax highlighting, validation, and editing capabilities for various programming languages.
 */
const meta = {
  title: 'components/CodeEditor',
  component: CodeEditor,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  render: (args) => {
    const CodeEditorStory = () => {
      const form = useForm({
        defaultValues: {
          content: args.value,
        },
      });

      return (
        <div style={{ width: '800px', height: '400px' }}>
          <form className="h-full">
            <Controller
              control={form.control}
              name="content"
              render={({ field }) => {
                return (
                  <ThemeAwareContainer
                    {...args}
                    component={CodeEditor}
                    onChange={(value: unknown) => {
                      field.onChange(value);
                    }}
                    height="200px"
                    value={field.value}
                  />
                );
              }}
            />
          </form>
        </div>
      );
    };

    return <CodeEditorStory />;
  },
} satisfies Meta<typeof CodeEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Basic string input - shows a single editor for simple code editing
 */
export const StringInput: Story = {
  args: {
    value: 'const greeting = "Hello World!";\nconsole.log(greeting);',
    readonly: false,
    language: 'typescript',
    showLineNumbers: true,
    placeholder: 'Enter your code here...',
  } as any,
};

/**
 * JavaScript code with syntax highlighting
 */
export const JavaScript: Story = {
  args: {
    value:
      'function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconsole.log(fibonacci(10));',
    readonly: false,
    language: 'javascript',
    showLineNumbers: true,
  } as any,
};

/**
 * Python code example
 */
export const Python: Story = {
  args: {
    value:
      'def factorial(n):\n    if n == 0 or n == 1:\n        return 1\n    else:\n        return n * factorial(n - 1)\n\nprint(factorial(5))',
    readonly: false,
    language: 'python',
    showLineNumbers: true,
  } as any,
};

/**
 * JSON data editing
 */
export const JSON: Story = {
  args: {
    value:
      '{\n  "name": "John Doe",\n  "age": 30,\n  "email": "john.doe@example.com",\n  "address": {\n    "street": "123 Main St",\n    "city": "Anytown",\n    "country": "USA"\n  }\n}',

    readonly: false,
    language: 'json',
    showLineNumbers: true,
  } as any,
};

/**
 * SQL query example
 */
export const SQL: Story = {
  args: {
    value:
      "SELECT u.name, u.email, COUNT(o.id) as order_count\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nWHERE u.created_at >= '2024-01-01'\nGROUP BY u.id, u.name, u.email\nORDER BY order_count DESC\nLIMIT 10;",
    readonly: false,
    language: 'sql',
    showLineNumbers: true,
  } as any,
};

/**
 * YAML configuration file
 */
export const YAML: Story = {
  args: {
    value:
      'version: \'3.8\'\nservices:\n  web:\n    image: nginx:latest\n    ports:\n      - "80:80"\n    volumes:\n      - ./html:/usr/share/nginx/html\n  database:\n    image: postgres:13\n    environment:\n      POSTGRES_DB: myapp\n      POSTGRES_USER: user\n      POSTGRES_PASSWORD: password',
    readonly: false,
    language: 'yaml',
    showLineNumbers: true,
  } as any,
};

/**
 * SourceCode object with tabs - shows Code and Dependencies tabs
 */
export const SourceCodeWithTabs: Story = {
  args: {
    value: {
      code: 'import { z } from "zod";\nimport { validateInput } from "./utils";\n\nconst userSchema = z.object({\n  name: z.string().min(1),\n  email: z.string().email(),\n  age: z.number().min(0).max(120)\n});\n\nexport function createUser(input: unknown) {\n  const validatedInput = userSchema.parse(input);\n  return validateInput(validatedInput);\n}',
      packageJson:
        '{\n  "name": "user-service",\n  "version": "1.0.0",\n  "dependencies": {\n    "zod": "^3.22.4",\n    "typescript": "^5.0.0"\n  },\n  "devDependencies": {\n    "@types/node": "^20.0.0",\n    "tsx": "^4.0.0"\n  }\n}',
    } as SourceCode,
    readonly: false,
    showTabs: true,
    language: 'typescript',
    showLineNumbers: true,
  } as any,
};

/**
 * Readonly mode - for displaying code without editing capabilities
 */
export const ReadonlyMode: Story = {
  args: {
    value: 'SELECT * FROM users WHERE active = true;',
    readonly: true,
    language: 'sql',
    showLineNumbers: true,
  } as any,
};

/**
 * Without line numbers - cleaner appearance for simple code snippets
 */
export const WithoutLineNumbers: Story = {
  args: {
    value: 'echo "Hello World"\ndate\nwhoami',
    readonly: false,
    language: 'shell',
    showLineNumbers: false,
  } as any,
};

/**
 * With placeholder text - shows when editor is empty
 */
export const WithPlaceholder: Story = {
  args: {
    value: '',
    readonly: false,
    language: 'typescript',
    showLineNumbers: true,
    placeholder: 'Start typing your TypeScript code here...',
  } as any,
};

/**
 * Custom height - fixed pixel height instead of percentage
 */
export const CustomHeight: Story = {
  args: {
    value:
      'function longFunction() {\n  // Line 1\n  // Line 2\n  // Line 3\n  // Line 4\n  // Line 5\n  // Line 6\n  // Line 7\n  // Line 8\n  // Line 9\n  // Line 10\n  return "This is a longer function";\n}',
    readonly: false,
    language: 'javascript',
    showLineNumbers: true,
    height: '100px',
  } as any,
};
