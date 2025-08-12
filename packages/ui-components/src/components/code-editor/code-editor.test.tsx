import { SourceCode } from '@openops/shared';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { CodeEditor } from './code-editor';

jest.mock('i18next', () => ({
  t: (key: string) => key,
}));

describe('CodeEditor', () => {
  describe('Basic Rendering', () => {
    it.each([
      ['JSON object', { name: 'test', value: 123 }],
      ['string', 'simple string'],
      ['null', null],
      ['undefined', undefined],
      ['array', [1, 2, 3, { nested: 'object' }]],
      ['boolean true', true],
      ['boolean false', false],
      ['number positive', 42],
      ['number zero', 0],
      ['number negative', -1],
      ['number decimal', 3.14],
      ['empty string', ''],
      ['empty object', {}],
      ['empty array', []],
    ])('renders with %s value', (_, testValue) => {
      expect(() =>
        render(<CodeEditor value={testValue} theme="light" />),
      ).not.toThrow();
    });

    it('renders with complex nested object', () => {
      const testValue = {
        user: {
          id: 123,
          profile: {
            name: 'John Doe',
            settings: {
              theme: 'dark',
              notifications: true,
            },
          },
        },
        items: [1, 2, 3],
        metadata: null,
      };
      expect(() =>
        render(<CodeEditor value={testValue} theme="light" />),
      ).not.toThrow();
    });
  });

  describe('Readonly Mode', () => {
    it.each([
      ['readonly true', true],
      ['readonly false', false],
      ['readonly undefined (defaults to editable)', undefined],
    ])('renders in %s mode', (description, readonly) => {
      const testValue = { name: 'test' };
      expect(() =>
        render(
          <CodeEditor value={testValue} theme="light" readonly={readonly} />,
        ),
      ).not.toThrow();
    });
  });

  describe('Event Handlers', () => {
    it.each([
      ['onChange handler', { onChange: jest.fn() }],
      ['onFocus handler', { onFocus: jest.fn() }],
      [
        'both onChange and onFocus handlers',
        { onChange: jest.fn(), onFocus: jest.fn() },
      ],
    ])('renders with %s', (description, handlers) => {
      const testValue = { name: 'test' };
      expect(() =>
        render(
          <CodeEditor
            value={testValue}
            theme="light"
            readonly={false}
            {...handlers}
          />,
        ),
      ).not.toThrow();
    });
  });

  describe('Styling and Theming', () => {
    it.each([
      ['light theme', { theme: 'light' }],
      ['dark theme', { theme: 'dark' }],
      ['custom className', { className: 'custom-class' }],
      ['custom containerClassName', { containerClassName: 'custom-container' }],
      [
        'both custom classNames',
        { className: 'custom-class', containerClassName: 'custom-container' },
      ],
    ])('renders with %s', (description, props) => {
      const testValue = { name: 'test' };
      expect(() =>
        render(<CodeEditor value={testValue} theme="light" {...props} />),
      ).not.toThrow();
    });
  });

  describe('Placeholder', () => {
    it.each([
      [
        'with placeholder text',
        { value: '', placeholder: 'Enter JSON here...' },
      ],
      ['without placeholder', { value: { name: 'test' } }],
    ])('renders %s', (description, props) => {
      expect(() =>
        render(<CodeEditor {...props} theme="light" />),
      ).not.toThrow();
    });
  });

  describe('ShowTabs Functionality', () => {
    const sourceCodeValue: SourceCode = {
      code: 'export const greeting = "Hello World!";\nconsole.log(greeting);',
      packageJson:
        '{\n  "name": "example",\n  "version": "1.0.0",\n  "dependencies": {\n    "lodash": "^4.17.21"\n  }\n}',
    };

    it('shows tabs when showTabs is true and value is SourceCode', () => {
      render(
        <CodeEditor value={sourceCodeValue} theme="light" showTabs={true} />,
      );

      expect(screen.getByText('Code')).toBeInTheDocument();
      expect(screen.getByText('Dependencies')).toBeInTheDocument();
    });

    it('does not show tabs when showTabs is false', () => {
      render(
        <CodeEditor value={sourceCodeValue} theme="light" showTabs={false} />,
      );

      expect(screen.queryByText('Code')).not.toBeInTheDocument();
      expect(screen.queryByText('Dependencies')).not.toBeInTheDocument();
    });

    it('does not show tabs when value is not SourceCode object', () => {
      render(
        <CodeEditor value="simple string" theme="light" showTabs={true} />,
      );

      expect(screen.queryByText('Code')).not.toBeInTheDocument();
      expect(screen.queryByText('Dependencies')).not.toBeInTheDocument();
    });

    it('switches between tabs when clicked', () => {
      const onChange = jest.fn();
      render(
        <CodeEditor
          value={sourceCodeValue}
          theme="light"
          showTabs={true}
          onChange={onChange}
        />,
      );

      const dependenciesTab = screen.getByText('Dependencies');
      fireEvent.click(dependenciesTab);

      // The tab should be visually selected (font-bold class)
      expect(dependenciesTab).toHaveClass('font-bold');
    });

    it('handles SourceCode object changes correctly', () => {
      const onChange = jest.fn();
      render(
        <CodeEditor
          value={sourceCodeValue}
          theme="light"
          showTabs={true}
          onChange={onChange}
        />,
      );

      // The component should render without errors
      expect(() =>
        render(
          <CodeEditor
            value={sourceCodeValue}
            theme="light"
            showTabs={true}
            onChange={onChange}
          />,
        ),
      ).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles circular reference objects gracefully', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      expect(() =>
        render(<CodeEditor value={circularObj} theme="light" />),
      ).not.toThrow();
    });

    it('handles JSON stringify errors gracefully', () => {
      const problematicValue = {
        func: function () {
          return 'test';
        },
        symbol: Symbol('test'),
        undefined: undefined,
      };

      expect(() =>
        render(<CodeEditor value={problematicValue} theme="light" />),
      ).not.toThrow();
    });

    it('handles very large objects', () => {
      const numKeys = 1000;
      const arrayLength = 1000;
      const hugeObject: any = {};

      for (let i = 0; i < numKeys; i++) {
        const key = `key_${i}`;
        hugeObject[key] = [];

        for (let j = 0; j < arrayLength; j++) {
          hugeObject[key].push(`string_${i}_${j}`);
        }
      }

      expect(() =>
        render(<CodeEditor value={hugeObject} theme="light" />),
      ).not.toThrow();
    });

    it.each([
      [
        'special characters',
        {
          special: 'Special chars: \n\t\r"\'\\',
          unicode: '🚀 Unicode: αβγ',
          html: '<div>HTML content</div>',
        },
      ],
      ['multiple instances', [{ component: 1 }, { component: 2 }]],
    ])('handles %s', (description, testData) => {
      if (Array.isArray(testData)) {
        expect(() =>
          render(
            <div>
              {testData.map((value, index) => (
                <CodeEditor key={index} value={value} theme="light" />
              ))}
            </div>,
          ),
        ).not.toThrow();
      } else {
        expect(() =>
          render(<CodeEditor value={testData} theme="light" />),
        ).not.toThrow();
      }
    });

    it('handles prop changes correctly', () => {
      const { rerender } = render(
        <CodeEditor value={{ test: 1 }} theme="light" readonly={false} />,
      );

      expect(() => {
        rerender(
          <CodeEditor value={{ test: 2 }} theme="light" readonly={true} />,
        );
        rerender(<CodeEditor value={{ test: 3 }} theme="dark" />);
        rerender(
          <CodeEditor
            value={{ test: 4 }}
            theme="light"
            placeholder="New placeholder"
          />,
        );
      }).not.toThrow();
    });
  });
});
