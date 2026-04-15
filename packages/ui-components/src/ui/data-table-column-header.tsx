import { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import { Button } from './button';

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const sortingState = column.getIsSorted();
  const isSortable = column.getCanSort();

  const renderSortIcon = () => {
    if (!isSortable) {
      return null;
    }

    if (sortingState === 'asc') {
      return <ArrowUp className="w-4 h-4 ml-2" />;
    }

    if (sortingState === 'desc') {
      return <ArrowDown className="w-4 h-4 ml-2" />;
    }

    return <ArrowUpDown className="w-4 h-4 ml-2" />;
  };

  return (
    <div className={`w-full ${className}`}>
      {isSortable ? (
        <Button
          variant="ghost"
          className="-mx-4 flex h-full w-[calc(100%+2rem)] items-center justify-start rounded-none px-4 py-4 text-sm font-semibold text-black dark:text-white hover:bg-transparent"
          onClick={() => column.toggleSorting(sortingState === 'asc')}
        >
          {title}
          {renderSortIcon()}
        </Button>
      ) : (
        <div className="py-4 text-sm font-semibold text-black dark:text-white">
          {title}
        </div>
      )}
    </div>
  );
}
