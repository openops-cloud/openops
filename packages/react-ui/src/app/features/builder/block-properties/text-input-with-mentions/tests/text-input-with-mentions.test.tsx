/* eslint-disable */

import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import { TextInputWithMentions } from '../index';

const mockSetInsertMentionHandler = jest.fn();

jest.mock('@/app/features/builder/builder-hooks', () => ({
  useBuilderStateContext: (selector: (state: unknown) => unknown) =>
    selector({
      flowVersion: {
        trigger: {
          name: 'trigger',
          displayName: 'Trigger',
          type: 'TRIGGER',
          settings: {},
          valid: true,
          nextAction: {
            name: 'step_a',
            displayName: 'Get EC2 Instances',
            type: 'BLOCK',
            settings: {},
            valid: true,
          },
        },
      },
      setInsertMentionHandler: mockSetInsertMentionHandler,
    }),
}));

jest.mock('@/app/features/blocks/lib/blocks-hook', () => ({
  blocksHooks: {
    useStepsMetadata: (steps: unknown[]) =>
      steps.map((step: unknown, index: number) => ({
        data: {
          displayName: (step as { displayName: string }).displayName,
          logoUrl: 'https://example.com/logo.png',
          stepDisplayName: (step as { displayName: string }).displayName,
        },
      })),
  },
}));

describe('TextInputWithMentions', () => {
  it('renders without crashing with plain text', async () => {
    const onChange = jest.fn();
    const { container } = render(
      <TextInputWithMentions
        initialValue="hello world"
        onChange={onChange}
        placeholder="Enter value"
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('.tiptap')).toBeInTheDocument();
    });
  });

  it('renders without crashing when initial value contains mention syntax', async () => {
    const onChange = jest.fn();

    // This is the key regression test: if renderHTML returns an invalid
    // DOMOutputSpec (e.g. a DOM Element instead of an array), ProseMirror
    // will throw "RangeError: Invalid array passed to renderSpec"
    expect(() => {
      render(
        <TextInputWithMentions
          initialValue="{{trigger.body}}"
          onChange={onChange}
        />,
      );
    }).not.toThrow();
  });

  it('renders mention nodes as spans with correct attributes', async () => {
    const onChange = jest.fn();
    const { container } = render(
      <TextInputWithMentions
        initialValue="{{trigger.body}}"
        onChange={onChange}
      />,
    );

    await waitFor(() => {
      const mention = container.querySelector('[data-type="mention"]');
      expect(mention).toBeInTheDocument();
      expect(mention?.tagName.toLowerCase()).toBe('span');
      expect(mention).toHaveAttribute('contenteditable', 'false');
    });
  });

  it('renders multiple mentions without errors', async () => {
    const onChange = jest.fn();

    expect(() => {
      render(
        <TextInputWithMentions
          initialValue="{{trigger.body}} and {{step_a.output}}"
          onChange={onChange}
        />,
      );
    }).not.toThrow();
  });
});
