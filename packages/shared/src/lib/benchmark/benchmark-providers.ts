export enum BenchmarkProviders {
  AWS = 'aws',
}

export type BenchmarkProvider =
  (typeof BenchmarkProviders)[keyof typeof BenchmarkProviders];
