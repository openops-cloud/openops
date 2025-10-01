import { createAction, Property } from '@openops/blocks-framework';
import { getAiProviderLanguageModel } from '@openops/common';
import { AiProviderEnum, analysisLLMSchema } from '@openops/shared';
import { generateObject } from 'ai';

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
    const sources = context.propsValue.sources ?? [];
    const composedPrompt =
      sources?.length > 0
        ? `${context.propsValue.prompt}\n\nSources:\n${sources}`
        : context.propsValue.prompt;

    const result = await generateObject({
      model: languageModel,
      prompt: composedPrompt,
      schema: analysisLLMSchema,
      ...((modelSettings as Record<string, unknown>) ?? {}),
    });
    return result.object;
  },
});
