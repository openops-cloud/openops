import { createAction, Property } from '@openops/blocks-framework';
import { getAiProviderLanguageModel } from '@openops/common';
import { AiProviderEnum } from '@openops/shared';
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
    sources: Property.Array({
      displayName: 'Sources',
      description: 'Array of sources to use for the analysis',
      required: false,
    }),
  },
  run: async (context) => {
    const auth = context.auth as unknown as Record<string, unknown>;
    const { providerModel, apiKey, baseURL, providerSettings, modelSettings } =
      auth;
    const { provider, model } = providerModel as {
      provider?: AiProviderEnum;
      model?: string;
    };

    const languageModel = await getAiProviderLanguageModel({
      provider: provider as AiProviderEnum,
      apiKey: apiKey as string,
      model: model as string,
      providerSettings: {
        ...((providerSettings as Record<string, unknown>) ?? {}),
        ...(baseURL ? { baseURL } : {}),
      },
    });

    const composedPrompt = context.propsValue.sources
      ? `${context.propsValue.prompt}\n\nSource:\n${context.propsValue.sources}`
      : context.propsValue.prompt;

    const result = await generateText({
      model: languageModel,
      prompt: composedPrompt,
      ...((modelSettings as Record<string, unknown>) ?? {}),
    });

    return result.text;
  },
});
