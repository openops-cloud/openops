import { SourceCode } from '@openops/shared';
import type { Meta, StoryObj } from '@storybook/react';
import { CodeEditor } from '../../components/code-editor';

const meta = {
  title: 'components/CodeEditor',
  component: CodeEditor,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    theme: {
      control: { type: 'select' },
      options: ['light', 'dark'],
    },
    readonly: {
      control: { type: 'boolean' },
    },
    showLineNumbers: {
      control: { type: 'boolean' },
    },
    showTabs: {
      control: { type: 'boolean' },
    },
    autoHeight: {
      control: { type: 'boolean' },
    },
    language: {
      control: { type: 'select' },
      options: ['json', 'javascript', 'typescript', 'html', 'css', 'python'],
    },
  },
} satisfies Meta<typeof CodeEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic JSON editor with light theme
 */
export const Basic: Story = {
  args: {
    value: { name: 'John Doe', age: 30, city: 'New York' },
    theme: 'light',
    readonly: false,
    showLineNumbers: true,
    height: '300px',
  },
};

/**
 * Dark theme JSON editor
 */
export const DarkTheme: Story = {
  args: {
    value: { name: 'John Doe', age: 30, city: 'New York' },
    theme: 'dark',
    readonly: false,
    showLineNumbers: true,
    height: '300px',
  },
};

/**
 * Readonly mode
 */
export const Readonly: Story = {
  args: {
    value: { name: 'John Doe', age: 30, city: 'New York' },
    theme: 'light',
    readonly: true,
    showLineNumbers: true,
    height: '300px',
  },
};

/**
 * JavaScript code editor
 */
export const JavaScript: Story = {
  args: {
    value: `function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));`,
    theme: 'light',
    readonly: false,
    showLineNumbers: true,
    language: 'javascript',
    height: '300px',
  },
};

/**
 * TypeScript code editor
 */
export const TypeScript: Story = {
  args: {
    value: `interface User {
  name: string;
  age: number;
  city: string;
}

function greetUser(user: User): string {
  return \`Hello, \${user.name} from \${user.city}!\`;
}

const user: User = {
  name: 'John Doe',
  age: 30,
  city: 'New York'
};

console.log(greetUser(user));`,
    theme: 'light',
    readonly: false,
    showLineNumbers: true,
    language: 'typescript',
    height: '400px',
  },
};

/**
 * SourceCode object with tabs - shows Code and Dependencies tabs
 */
export const SourceCodeWithTabs: Story = {
  args: {
    value: {
      code: `export const greeting = "Hello World!";
console.log(greeting);

export function add(a: number, b: number): number {
  return a + b;
}`,
      packageJson: `{
  "name": "example",
  "version": "1.0.0",
  "description": "A sample project",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "jest"
  },
  "dependencies": {
    "lodash": "^4.17.21",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}`,
    } as SourceCode,
    theme: 'light',
    readonly: false,
    showTabs: true,
    height: '400px',
  },
};

/**
 * SourceCode object with tabs in dark theme
 */
export const SourceCodeWithTabsDark: Story = {
  args: {
    value: {
      code: `export const greeting = "Hello World!";
console.log(greeting);

export function add(a: number, b: number): number {
  return a + b;
}`,
      packageJson: `{
  "name": "example",
  "version": "1.0.0",
  "description": "A sample project",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "jest"
  },
  "dependencies": {
    "lodash": "^4.17.21",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}`,
    } as SourceCode,
    theme: 'dark',
    readonly: false,
    showTabs: true,
    height: '400px',
  },
};

/**
 * SourceCode object with tabs in readonly mode
 */
export const SourceCodeWithTabsReadonly: Story = {
  args: {
    value: {
      code: `export const greeting = "Hello World!";
console.log(greeting);

export function add(a: number, b: number): number {
  return a + b;
}`,
      packageJson: `{
  "name": "example",
  "version": "1.0.0",
  "description": "A sample project",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "jest"
  },
  "dependencies": {
    "lodash": "^4.17.21",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}`,
    } as SourceCode,
    theme: 'light',
    readonly: true,
    showTabs: true,
    height: '400px',
  },
};

/**
 * Auto-height editor that adjusts to content
 */
export const AutoHeight: Story = {
  args: {
    value: `{
  "name": "auto-height-example",
  "version": "1.0.0",
  "description": "This editor automatically adjusts its height based on content",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "jest",
    "build": "tsc",
    "dev": "nodemon"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5"
  }
}`,
    theme: 'light',
    readonly: false,
    showLineNumbers: true,
    autoHeight: true,
    minHeight: 100,
    maxHeight: 600,
  },
};

/**
 * Editor with placeholder text
 */
export const WithPlaceholder: Story = {
  args: {
    value: '',
    theme: 'light',
    readonly: false,
    showLineNumbers: true,
    placeholder: 'Enter your JSON data here...',
    height: '300px',
  },
};
