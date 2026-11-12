import { Property } from '@openops/blocks-framework';

export const dateRangeProperties = {
  startDate: Property.DateTime({
    displayName: 'Start Date',
    description: 'The start of the period to query',
    required: true,
  }),
  endDate: Property.DateTime({
    displayName: 'End Date',
    description: 'The end of the period to query',
    required: true,
  }),
};

export function toUnixSeconds(value: string, fieldName: string): number {
  const milliseconds = Date.parse(value);

  if (Number.isNaN(milliseconds)) {
    throw new Error(`${fieldName} is not a valid date: ${value}`);
  }

  return Math.floor(milliseconds / 1000);
}

export function toUnixDateRange(
  startDate: string,
  endDate: string,
): { start_date: number; end_date: number } {
  const start = toUnixSeconds(startDate, 'Start Date');
  const end = toUnixSeconds(endDate, 'End Date');

  if (start > end) {
    throw new Error('Start Date must be before End Date');
  }

  return { start_date: start, end_date: end };
}
