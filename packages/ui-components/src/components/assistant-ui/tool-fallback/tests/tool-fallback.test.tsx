import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ToolFallback } from '../tool-fallback';

jest.mock('../../../code-editor', () => ({
  CodeEditor: ({ value, language }: { value: unknown; language?: string }) => {
    const formatValue = (val: unknown): string => {
      if (typeof val === 'string') {
        return val;
      }
      if (['json', 'javascript', 'typescript'].includes(language || 'json')) {
        try {
          return JSON.stringify(val, null, 2);
        } catch {
          return String(val);
        }
      }
      return String(val);
    };
    return <div data-testid="code-editor">{formatValue(value)}</div>;
  },
}));

describe('ToolFallback', () => {
  const defaultProps = {
    toolName: 'test_tool',
    argsText: '{"param": "value"}',
    status: { type: 'complete' as const },
    theme: 'light' as const,
  };

  const expandTool = () => {
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);
  };

  it('should render tool name and be collapsed by default', () => {
    render(<ToolFallback {...defaultProps} />);

    expect(screen.getByText('test_tool')).toBeInTheDocument();

    expect(screen.queryByText('Arguments:')).not.toBeInTheDocument();

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should render arguments when expanded', () => {
    render(<ToolFallback {...defaultProps} />);

    expandTool();

    expect(screen.getByText('Arguments:')).toBeInTheDocument();
    const codeEditors = screen.getAllByTestId('code-editor');
    expect(codeEditors[0]).toHaveTextContent('"param": "value"');
  });

  it('should render result when provided and expanded', () => {
    const props = {
      ...defaultProps,
      result: { data: 'test result' },
    };

    render(<ToolFallback {...props} />);

    expect(screen.queryByText('Result:')).not.toBeInTheDocument();

    expandTool();

    expect(screen.getByText('Result:')).toBeInTheDocument();
    const codeEditors = screen.getAllByTestId('code-editor');
    expect(codeEditors[1]).toHaveTextContent('"data": "test result"');
  });

  it('should handle content structure result', () => {
    const contentStructureResult = {
      content: [
        {
          type: 'text',
          text: '{"data": [{"id": "123", "status": "active"}]}',
        },
      ],
    };

    const props = {
      ...defaultProps,
      result: contentStructureResult,
    };

    render(<ToolFallback {...props} />);

    expandTool();

    expect(screen.getByText('Result:')).toBeInTheDocument();
    const codeEditors = screen.getAllByTestId('code-editor');
    expect(codeEditors[1]).toHaveTextContent('"id": "123"');
    expect(codeEditors[1]).toHaveTextContent('"status": "active"');
  });

  it('should handle string result', () => {
    const props = {
      ...defaultProps,
      result: 'Simple string result',
    };

    render(<ToolFallback {...props} />);

    expandTool();

    const codeEditors = screen.getAllByTestId('code-editor');
    expect(codeEditors[1]).toHaveTextContent('Simple string result');
  });

  it('should handle JSON string result', () => {
    const props = {
      ...defaultProps,
      result: '{"formatted": true, "number": 42}',
    };

    render(<ToolFallback {...props} />);

    expandTool();

    const codeEditors = screen.getAllByTestId('code-editor');
    // Should be formatted as proper JSON
    expect(codeEditors[1]).toHaveTextContent('"formatted": true');
    expect(codeEditors[1]).toHaveTextContent('"number": 42');
  });

  it('should not render result section when result is undefined', () => {
    render(<ToolFallback {...defaultProps} />);

    expandTool();

    expect(screen.queryByText('Result:')).not.toBeInTheDocument();
    // Should only have one code editor (for arguments)
    const codeEditors = screen.getAllByTestId('code-editor');
    expect(codeEditors).toHaveLength(1);
  });

  it('should handle null result', () => {
    const props = {
      ...defaultProps,
      result: null,
    };

    render(<ToolFallback {...props} />);

    expandTool();

    expect(screen.getByText('Result:')).toBeInTheDocument();
    const codeEditors = screen.getAllByTestId('code-editor');
    expect(codeEditors[1]).toHaveTextContent('null');
  });

  it('should toggle collapsed state when expand button is clicked', () => {
    render(<ToolFallback {...defaultProps} />);

    const expandButton = screen.getByRole('button');

    // Initially collapsed
    expect(screen.queryByText('Arguments:')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(expandButton);
    expect(screen.getByText('Arguments:')).toBeInTheDocument();

    // Click to collapse again
    fireEvent.click(expandButton);
    expect(screen.queryByText('Arguments:')).not.toBeInTheDocument();
  });

  it('should format result using the enhanced JSON parser', () => {
    const complexContentStructure = {
      content: [
        {
          type: 'text',
          text: '{\n  "data": [\n    {\n      "id": "aK3T27MRliBIxYKfHSxSF",\n      "created": "2025-08-18T16:34:04.527Z",\n      "status": "active"\n    }\n  ]\n}',
        },
      ],
    };

    const props = {
      ...defaultProps,
      result: complexContentStructure,
    };

    render(<ToolFallback {...props} />);

    expandTool();

    const codeEditors = screen.getAllByTestId('code-editor');
    // Should parse and format the nested JSON
    expect(codeEditors[1]).toHaveTextContent('"id": "aK3T27MRliBIxYKfHSxSF"');
    expect(codeEditors[1]).toHaveTextContent('"status": "active"');
    expect(codeEditors[1]).toHaveTextContent('2025-08-18T16:34:04.527Z');
  });
});
