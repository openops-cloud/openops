import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { TagInput } from '../tag-input';

const Harness = ({ initial = [] as string[] }) => {
  const [value, setValue] = useState<ReadonlyArray<string>>(initial);
  return <TagInput value={value} onChange={setValue} placeholder="add value" />;
};

function input(): HTMLInputElement {
  return screen.getByRole('textbox') as HTMLInputElement;
}

describe('TagInput', () => {
  it('commits a chip on Enter, preserving inner spaces', () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: 'pending migration' } });
    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(screen.getByText('pending migration')).toBeInTheDocument();
    expect(input().value).toBe('');
  });

  it('does not split on spaces while typing', () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: 'pending mig' } });

    expect(input().value).toBe('pending mig');
    expect(screen.queryByText('pending')).not.toBeInTheDocument();
  });

  it('splits pasted comma-separated values into chips', () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: 'a,b,c' } });

    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.getByText('c')).toBeInTheDocument();
  });

  it('deduplicates and trims values', () => {
    render(<Harness initial={['compliance']} />);
    fireEvent.change(input(), { target: { value: '  compliance  ' } });
    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(screen.getAllByText('compliance')).toHaveLength(1);
  });

  it('removes a chip via its remove button', () => {
    render(<Harness initial={['compliance', 'migration']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove compliance' }));

    expect(screen.queryByText('compliance')).not.toBeInTheDocument();
    expect(screen.getByText('migration')).toBeInTheDocument();
  });

  it('removes the last chip on Backspace when the input is empty', () => {
    render(<Harness initial={['compliance', 'migration']} />);
    fireEvent.keyDown(input(), { key: 'Backspace' });

    expect(screen.queryByText('migration')).not.toBeInTheDocument();
    expect(screen.getByText('compliance')).toBeInTheDocument();
  });

  it('shows the placeholder only while no values exist', () => {
    render(<Harness />);
    expect(input()).toHaveAttribute('placeholder', 'add value');

    fireEvent.change(input(), { target: { value: 'compliance' } });
    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(input()).not.toHaveAttribute('placeholder');
  });

  it('disables the inner input when disabled', () => {
    render(
      <TagInput
        value={['compliance']}
        onChange={() => undefined}
        placeholder="add value"
        disabled
      />,
    );

    expect(input()).toBeDisabled();
  });

  it('disables chip remove buttons when disabled and does not fire onChange when clicked', () => {
    const onChange = jest.fn();
    render(
      <TagInput
        value={['compliance', 'migration']}
        onChange={onChange}
        placeholder="add value"
        disabled
      />,
    );

    const removeButton = screen.getByRole('button', {
      name: 'Remove compliance',
    });
    expect(removeButton).toBeDisabled();

    fireEvent.click(removeButton);
    expect(onChange).not.toHaveBeenCalled();
  });
});
