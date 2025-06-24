import { render } from '@testing-library/react';
import React from 'react';
import { CodeMirrorEditor } from './code-mirror-editor';

describe('CodeMirrorEditor', () => {
  it('renders with JSON value', () => {
    const testValue = { name: 'test', value: 123 };
    expect(() => render(<CodeMirrorEditor value={testValue} />)).not.toThrow();
  });

  it('renders in readonly mode', () => {
    const testValue = { name: 'test' };
    expect(() =>
      render(<CodeMirrorEditor value={testValue} readonly={true} />),
    ).not.toThrow();
  });

  it('renders with onChange handler', () => {
    const testValue = { name: 'test' };
    const onChange = jest.fn();

    expect(() =>
      render(
        <CodeMirrorEditor
          value={testValue}
          onChange={onChange}
          readonly={false}
        />,
      ),
    ).not.toThrow();
  });
});
