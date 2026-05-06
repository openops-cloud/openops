import { SortDirection } from '@openops/shared';

export function isSortDirection(
  sortDirection?: string,
): sortDirection is SortDirection {
  return (
    !!sortDirection &&
    Object.values(SortDirection).includes(sortDirection as SortDirection)
  );
}
