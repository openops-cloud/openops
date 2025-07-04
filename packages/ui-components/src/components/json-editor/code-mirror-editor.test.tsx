import { render } from '@testing-library/react';
import React from 'react';
import { CodeMirrorEditor } from './code-mirror-editor';

describe('CodeMirrorEditor', () => {
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
    ])('renders with %s value', (description, testValue) => {
      expect(() =>
        render(<CodeMirrorEditor value={testValue} />),
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
        render(<CodeMirrorEditor value={testValue} />),
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
        render(<CodeMirrorEditor value={testValue} readonly={readonly} />),
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
          <CodeMirrorEditor value={testValue} readonly={false} {...handlers} />,
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
        render(<CodeMirrorEditor value={testValue} {...props} />),
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
      expect(() => render(<CodeMirrorEditor {...props} />)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles circular reference objects gracefully', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      // The component should handle circular references"
      expect(() =>
        render(<CodeMirrorEditor value={circularObj} />),
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
        render(<CodeMirrorEditor value={problematicValue} />),
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
        render(<CodeMirrorEditor value={hugeObject} />),
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
        // Handle multiple instances case
        expect(() =>
          render(
            <div>
              {testData.map((value, index) => (
                <CodeMirrorEditor key={index} value={value} />
              ))}
            </div>,
          ),
        ).not.toThrow();
      } else {
        // Handle single value case
        expect(() =>
          render(<CodeMirrorEditor value={testData} />),
        ).not.toThrow();
      }
    });

    it('handles prop changes correctly', () => {
      const { rerender } = render(
        <CodeMirrorEditor value={{ test: 1 }} readonly={false} />,
      );

      expect(() => {
        rerender(<CodeMirrorEditor value={{ test: 2 }} readonly={true} />);
        rerender(<CodeMirrorEditor value={{ test: 3 }} theme="dark" />);
        rerender(
          <CodeMirrorEditor
            value={{ test: 4 }}
            placeholder="New placeholder"
          />,
        );
      }).not.toThrow();
    });
  });
});
