import { createAction, Property } from '@openops/blocks-framework';
import { getAiProviderLanguageModel } from '@openops/common';
import { generateText } from 'ai';

export const analyze = createAction({
  displayName: 'Analyze with AI',
  description: 'Analyze or transform input using an LLM based on a prompt',
  name: 'analyze',
  props: {
    prompt: Property.LongText({
      displayName: 'Prompt',
      required: true,
    }),
    source: Property.LongText({
      displayName: 'Source (optional)',
      required: false,
    }),
  },
  run: async (context) => {
    const auth = context.auth as unknown as Record<string, unknown>;
    const {
      provider,
      model,
      apiKey,
      baseURL,
      providerSettings,
      modelSettings,
    } = auth;

    const languageModel = await getAiProviderLanguageModel({
      provider: provider as any,
      apiKey: apiKey as string,
      model: model as string,
      providerSettings: {
        ...(providerSettings ?? {}),
        ...(baseURL ? { baseURL } : {}),
      },
    });

    const composedPrompt = context.propsValue.source
      ? `${context.propsValue.prompt}\n\nSource:\n${context.propsValue.source}`
      : context.propsValue.prompt;

    const result = await generateText({
      model: languageModel,
      prompt: composedPrompt,
      ...(modelSettings ?? {}),
    });

    return result.text;
  },
});
