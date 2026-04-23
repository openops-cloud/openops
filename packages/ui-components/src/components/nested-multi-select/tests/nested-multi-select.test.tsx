import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { NestedMultiSelect, type NestedOption } from '../nested-multi-select';

const mockOptions: NestedOption[] = [
  {
    id: 'group1',
    displayName: 'Group 1',
    items: [
      { id: 'item1', displayName: 'Item 1' },
      { id: 'item2', displayName: 'Item 2' },
      { id: 'item3', displayName: 'Item 3' },
    ],
  },
  {
    id: 'group2',
    displayName: 'Group 2',
    imageLogoUrl: 'https://example.com/logo.png',
    items: [
      { id: 'item4', displayName: 'Item 4' },
      { id: 'item5', displayName: 'Item 5' },
    ],
  },
  {
    id: 'group3',
    displayName: 'Group 3 (Empty)',
    items: [],
  },
  {
    id: 'group4',
    displayName: 'Group 4 (No Items)',
  },
];

describe('NestedMultiSelect', () => {
  describe('Basic Rendering', () => {
    it('renders with empty options', () => {
      const onValueChange = jest.fn();
      expect(() =>
        render(
          <NestedMultiSelect
            options={[]}
            value={{}}
            onValueChange={onValueChange}
          />,
        ),
      ).not.toThrow();
    });

    it('renders all groups', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{}}
          onValueChange={onValueChange}
        />,
      );

      expect(screen.getByText('Group 1')).toBeInTheDocument();
      expect(screen.getByText('Group 2')).toBeInTheDocument();
      expect(screen.getByText('Group 3 (Empty)')).toBeInTheDocument();
      expect(screen.getByText('Group 4 (No Items)')).toBeInTheDocument();
    });

    it('renders group with image logo', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{}}
          onValueChange={onValueChange}
        />,
      );

      const logo = screen.getByAltText('Group 2');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', 'https://example.com/logo.png');
    });

    it('disables group checkbox when no items', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{}}
          onValueChange={onValueChange}
        />,
      );

      const emptyGroupCheckbox = screen.getByLabelText('Group 3 (Empty)');
      expect(emptyGroupCheckbox).toBeDisabled();

      const noItemsGroupCheckbox = screen.getByLabelText('Group 4 (No Items)');
      expect(noItemsGroupCheckbox).toBeDisabled();
    });
  });

  describe('Initial State with Pre-selected Values', () => {
    it('opens groups with selected items on mount', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{ group1: ['item1', 'item2'] }}
          onValueChange={onValueChange}
        />,
      );

      expect(screen.getByText('Item 1')).toBeVisible();
      expect(screen.getByText('Item 2')).toBeVisible();
    });

    it('keeps groups without selected items closed on mount', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{ group1: ['item1'] }}
          onValueChange={onValueChange}
        />,
      );

      expect(screen.queryByText('Item 4')).not.toBeInTheDocument();
      expect(screen.queryByText('Item 5')).not.toBeInTheDocument();
    });

    it('checks individual items based on value prop', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{ group1: ['item1', 'item3'] }}
          onValueChange={onValueChange}
        />,
      );

      const item1Checkbox = screen.getByLabelText('Item 1');
      const item2Checkbox = screen.getByLabelText('Item 2');
      const item3Checkbox = screen.getByLabelText('Item 3');

      expect(item1Checkbox).toBeChecked();
      expect(item2Checkbox).not.toBeChecked();
      expect(item3Checkbox).toBeChecked();
    });

    it('checks group checkbox when all items are selected', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{ group1: ['item1', 'item2', 'item3'] }}
          onValueChange={onValueChange}
        />,
      );

      const groupCheckbox = screen.getByLabelText('Group 1');
      expect(groupCheckbox).toBeChecked();
    });
  });

  describe('Group Expansion/Collapse', () => {
    it('expands group when chevron is clicked', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{}}
          onValueChange={onValueChange}
        />,
      );

      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();

      const group1 = screen.getByText('Group 1').closest('div')?.parentElement;
      const chevron = within(group1!).getByRole('button');
      fireEvent.click(chevron);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('collapses group when chevron is clicked again', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{ group1: ['item1'] }}
          onValueChange={onValueChange}
        />,
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();

      const group1 = screen.getByText('Group 1').closest('div')?.parentElement;
      const chevron = within(group1!).getByRole('button');
      fireEvent.click(chevron);

      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });
  });

  describe('Group Checkbox Toggle', () => {
    it('selects all items when group checkbox is clicked from unchecked state', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{}}
          onValueChange={onValueChange}
        />,
      );

      const groupCheckbox = screen.getByLabelText('Group 1');
      fireEvent.click(groupCheckbox);

      expect(onValueChange).toHaveBeenCalledWith({
        group1: ['item1', 'item2', 'item3'],
      });
    });

    it('deselects all items when group checkbox is clicked from fully checked state', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{ group1: ['item1', 'item2', 'item3'] }}
          onValueChange={onValueChange}
        />,
      );

      const groupCheckbox = screen.getByLabelText('Group 1');
      fireEvent.click(groupCheckbox);

      expect(onValueChange).toHaveBeenCalledWith({});
    });

    it('selects all items when group checkbox is clicked from partially checked state', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{ group1: ['item1'] }}
          onValueChange={onValueChange}
        />,
      );

      const groupCheckbox = screen.getByLabelText('Group 1');
      fireEvent.click(groupCheckbox);

      expect(onValueChange).toHaveBeenCalledWith({
        group1: ['item1', 'item2', 'item3'],
      });
    });

    it('preserves other group selections when toggling group', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{ group2: ['item4'] }}
          onValueChange={onValueChange}
        />,
      );

      const groupCheckbox = screen.getByLabelText('Group 1');
      fireEvent.click(groupCheckbox);

      expect(onValueChange).toHaveBeenCalledWith({
        group1: ['item1', 'item2', 'item3'],
        group2: ['item4'],
      });
    });
  });

  describe('Individual Item Toggle', () => {
    it('selects item when clicked from unchecked state', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{ group1: ['item1'] }}
          onValueChange={onValueChange}
        />,
      );

      const item2Checkbox = screen.getByLabelText('Item 2');
      fireEvent.click(item2Checkbox);

      expect(onValueChange).toHaveBeenCalledWith({
        group1: ['item1', 'item2'],
      });
    });

    it('deselects item when clicked from checked state', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{ group1: ['item1', 'item2'] }}
          onValueChange={onValueChange}
        />,
      );

      const item2Checkbox = screen.getByLabelText('Item 2');
      fireEvent.click(item2Checkbox);

      expect(onValueChange).toHaveBeenCalledWith({
        group1: ['item1'],
      });
    });

    it('removes group from value when last item is deselected', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{ group1: ['item1'], group2: ['item4'] }}
          onValueChange={onValueChange}
        />,
      );

      const item1Checkbox = screen.getByLabelText('Item 1');
      fireEvent.click(item1Checkbox);

      expect(onValueChange).toHaveBeenCalledWith({
        group2: ['item4'],
      });
    });

    it('preserves other group selections when toggling item', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{ group1: ['item1'], group2: ['item4'] }}
          onValueChange={onValueChange}
        />,
      );

      const item2Checkbox = screen.getByLabelText('Item 2');
      fireEvent.click(item2Checkbox);

      expect(onValueChange).toHaveBeenCalledWith({
        group1: ['item1', 'item2'],
        group2: ['item4'],
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles single item group', () => {
      const singleItemOptions: NestedOption[] = [
        {
          id: 'group',
          displayName: 'Single Item Group',
          items: [{ id: 'item', displayName: 'Only Item' }],
        },
      ];

      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={singleItemOptions}
          value={{}}
          onValueChange={onValueChange}
        />,
      );

      const groupCheckbox = screen.getByLabelText('Single Item Group');
      fireEvent.click(groupCheckbox);

      expect(onValueChange).toHaveBeenCalledWith({
        group: ['item'],
      });
    });

    it('handles many items in a group', () => {
      const manyItemsOptions: NestedOption[] = [
        {
          id: 'group',
          displayName: 'Many Items Group',
          items: Array.from({ length: 100 }, (_, i) => ({
            id: `item${i}`,
            displayName: `Item ${i}`,
          })),
        },
      ];

      const onValueChange = jest.fn();
      expect(() =>
        render(
          <NestedMultiSelect
            options={manyItemsOptions}
            value={{}}
            onValueChange={onValueChange}
          />,
        ),
      ).not.toThrow();
    });

    it('handles value with non-existent group id', () => {
      const onValueChange = jest.fn();
      expect(() =>
        render(
          <NestedMultiSelect
            options={mockOptions}
            value={{ nonExistentGroup: ['item1'] }}
            onValueChange={onValueChange}
          />,
        ),
      ).not.toThrow();
    });

    it('handles value with non-existent item id in existing group', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{ group1: ['item1', 'nonExistentItem'] }}
          onValueChange={onValueChange}
        />,
      );

      const groupCheckbox = screen.getByLabelText('Group 1');
      expect(groupCheckbox).not.toBeChecked();
    });

    it('handles duplicate item ids in value array', () => {
      const onValueChange = jest.fn();
      render(
        <NestedMultiSelect
          options={mockOptions}
          value={{ group1: ['item1', 'item1', 'item2'] }}
          onValueChange={onValueChange}
        />,
      );

      const item1Checkbox = screen.getByLabelText('Item 1');
      expect(item1Checkbox).toBeChecked();
    });

    it('handles special characters in display names', () => {
      const specialCharsOptions: NestedOption[] = [
        {
          id: 'group',
          displayName: 'Group <>&"\'',
          items: [
            { id: 'item1', displayName: 'Item <>&"\'' },
            { id: 'item2', displayName: 'Item with 🚀 emoji' },
          ],
        },
      ];

      const onValueChange = jest.fn();
      expect(() =>
        render(
          <NestedMultiSelect
            options={specialCharsOptions}
            value={{}}
            onValueChange={onValueChange}
          />,
        ),
      ).not.toThrow();
    });

    it('handles prop changes correctly', () => {
      const onValueChange = jest.fn();
      const { rerender } = render(
        <NestedMultiSelect
          options={mockOptions}
          value={{}}
          onValueChange={onValueChange}
        />,
      );

      expect(() => {
        rerender(
          <NestedMultiSelect
            options={mockOptions}
            value={{ group1: ['item1'] }}
            onValueChange={onValueChange}
          />,
        );
        rerender(
          <NestedMultiSelect
            options={mockOptions.slice(0, 2)}
            value={{ group1: ['item1', 'item2'] }}
            onValueChange={onValueChange}
          />,
        );
      }).not.toThrow();
    });
  });

  describe('ForwardRef', () => {
    it('forwards ref to container div', () => {
      const ref = React.createRef<HTMLDivElement>();
      const onValueChange = jest.fn();

      render(
        <NestedMultiSelect
          ref={ref}
          options={mockOptions}
          value={{}}
          onValueChange={onValueChange}
        />,
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveClass('p-4');
    });
  });
});
