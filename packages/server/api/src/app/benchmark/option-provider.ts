import {
  ApplicationError,
  BenchmarkConfiguration,
  BenchmarkWizardOption,
  ErrorCode,
} from '@openops/shared';

export type WizardContext = {
  benchmarkConfiguration?: BenchmarkConfiguration;
  projectId?: string;
  provider: string;
};

export type BenchmarkWizardOptionProvider = {
  getOptions(
    method: string,
    context: WizardContext,
  ): Promise<BenchmarkWizardOption[]>;
};

const providers = new Map<string, BenchmarkWizardOptionProvider>();

export function registerOptionProvider(
  provider: string,
  adapter: BenchmarkWizardOptionProvider,
): void {
  providers.set(provider.toLowerCase(), adapter);
}

export function getOptionProvider(
  provider: string,
): BenchmarkWizardOptionProvider {
  const normalized = provider.toLowerCase();
  const adapter = providers.get(normalized);
  if (!adapter) {
    const message = `Option provider not found for provider: ${provider}`;
    throw new ApplicationError(
      { code: ErrorCode.VALIDATION, params: { message } },
      message,
    );
  }
  return adapter;
}
