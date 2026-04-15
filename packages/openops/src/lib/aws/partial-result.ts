export type FailedRegion = {
  region: string;
  accountId?: string;
  error: string;
};

export type PartialResult<T = unknown> = {
  results: T[];
  failedRegions: FailedRegion[];
};

export function formatAwsError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}
