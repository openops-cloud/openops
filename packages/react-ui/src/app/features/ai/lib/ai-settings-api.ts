export const aiSettingsApi = {
  getProviderOptions(): Promise<any> {
    return new Promise<any>((resolve) =>
      resolve([
        {
          displayName: 'OpenAI',
          key: 'openai',
          models: ['gpt-4-turbo', 'gpt-3.5-turbo'],
        },
        {
          displayName: 'Gemini',
          key: 'gemini',
          models: ['gemini-1.5-pro-latest', 'gemini-1.5-flash'],
        },
      ]),
    );
  },
};
