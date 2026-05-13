import * as React from 'react';

import { ChevronDown } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Checkbox } from '../../ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../ui/collapsible';
import { Label } from '../../ui/label';

export type NestedItem = {
  id: string;
  displayName: string;
};

export type NestedOption = {
  id: string;
  displayName: string;
  imageLogoUrl?: string;
  items?: NestedItem[];
};

interface NestedMultiSelectProps {
  options: NestedOption[];
  value: Record<string, string[]>;
  onValueChange: (value: Record<string, string[]>) => void;
}

const NestedMultiSelect = React.forwardRef<
  HTMLDivElement,
  NestedMultiSelectProps
>(({ options, value, onValueChange }, ref) => {
  const [openGroups, setOpenGroups] = React.useState<Set<string>>(() => {
    const initial = new Set<string>();
    options.forEach((option) => {
      if (value[option.id]?.length > 0) {
        initial.add(option.id);
      }
    });
    return initial;
  });

  React.useEffect(() => {
    setOpenGroups((prev) => {
      const validGroupIds = new Set(options.map((option) => option.id));
      const next = new Set(
        [...prev].filter((groupId) => validGroupIds.has(groupId)),
      );
      options.forEach((option) => {
        if (value[option.id]?.length > 0) {
          next.add(option.id);
        }
      });
      return next;
    });
  }, [options, value]);

  const toggleGroup = React.useCallback((groupId: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const handleGroupToggle = React.useCallback(
    (groupId: string, items: NestedOption['items']) => {
      const currentItems = value[groupId] || [];
      const allItemIds = items?.map((i) => i.id) || [];
      const currentItemsSet = new Set(currentItems);
      const allSelected =
        allItemIds.length > 0 &&
        allItemIds.every((id) => currentItemsSet.has(id));

      if (allSelected) {
        const newValue = { ...value };
        delete newValue[groupId];
        onValueChange(newValue);
      } else {
        onValueChange({
          ...value,
          [groupId]: allItemIds,
        });
      }
    },
    [value, onValueChange],
  );

  const handleItemToggle = React.useCallback(
    (groupId: string, itemId: string) => {
      const currentItems = value[groupId] || [];
      const newItems = currentItems.includes(itemId)
        ? currentItems.filter((id) => id !== itemId)
        : [...currentItems, itemId];

      if (newItems.length === 0) {
        const newValue = { ...value };
        delete newValue[groupId];
        onValueChange(newValue);
      } else {
        onValueChange({
          ...value,
          [groupId]: newItems,
        });
      }
    },
    [value, onValueChange],
  );

  return (
    <div ref={ref} className="p-4 space-y-2 max-h-[45vh] overflow-y-auto">
      {options.map((option) => {
        const selectedItems = value[option.id] || [];
        const itemIds = option.items?.map((i) => i.id) || [];
        const selectedItemsSet = new Set(selectedItems);
        const allSelected =
          itemIds.length > 0 && itemIds.every((id) => selectedItemsSet.has(id));
        const someSelected =
          itemIds.some((id) => selectedItemsSet.has(id)) && !allSelected;
        const isOpen = openGroups.has(option.id);

        let checkboxState: boolean | 'indeterminate' = false;
        if (allSelected) {
          checkboxState = true;
        } else if (someSelected) {
          checkboxState = 'indeterminate';
        }

        return (
          <Collapsible
            key={option.id}
            open={isOpen}
            onOpenChange={() => toggleGroup(option.id)}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`group-${option.id}`}
                    checked={checkboxState}
                    disabled={!option.items || option.items.length === 0}
                    onCheckedChange={() =>
                      handleGroupToggle(option.id, option.items)
                    }
                  />
                  {option.imageLogoUrl && (
                    <img
                      src={option.imageLogoUrl}
                      alt={option.displayName}
                      className="w-5 h-5 object-contain"
                    />
                  )}
                  <Label
                    htmlFor={`group-${option.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.displayName}
                  </Label>
                </div>
                <CollapsibleTrigger
                  className="cursor-pointer hover:opacity-70 transition-opacity"
                  aria-label={`Toggle ${option.displayName}`}
                >
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform',
                      { 'rotate-180': isOpen },
                    )}
                  />
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <div className="ml-8 space-y-2">
                  {option.items?.map((item) => {
                    const isChecked = Boolean(selectedItemsSet.has(item.id));
                    return (
                      <div
                        key={item.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`item-${option.id}-${item.id}`}
                          checked={isChecked}
                          onCheckedChange={() =>
                            handleItemToggle(option.id, item.id)
                          }
                        />
                        <Label
                          htmlFor={`item-${option.id}-${item.id}`}
                          className="cursor-pointer text-sm font-normal"
                        >
                          {item.displayName}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
});
NestedMultiSelect.displayName = 'NestedMultiSelect';

export { NestedMultiSelect };
export type { NestedMultiSelectProps };
