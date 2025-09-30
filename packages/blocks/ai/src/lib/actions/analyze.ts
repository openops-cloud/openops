import {
  BlockPropValueSchema,
  createAction,
  Property,
} from '@openops/blocks-framework';
import {
  aiAuth,
  getAiModelFromConnection,
  getAiProviderLanguageModel,
} from '@openops/common';
import { AiProviderEnum } from '@openops/shared';
import { generateText } from 'ai';

export const analyze = createAction({
  displayName: 'Analyze with AI',
  description: 'Analyze or transform input using an LLM based on a prompt',
  name: 'analyze',
  props: {
    sources: Property.Array({
      displayName: 'Sources',
      description: 'Array of sources to use for the analysis',
      required: false,
    }),
    prompt: Property.LongText({
      displayName: 'Prompt',
      required: true,
    }),
  },
  run: async (context) => {
    const auth = context.auth as BlockPropValueSchema<typeof aiAuth>;
    const { provider, apiKey, baseURL, providerSettings, modelSettings } = auth;

    const model = getAiModelFromConnection(auth.model, auth.customModel);

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

    const result = await generateText({
      model: languageModel,
      prompt: composedPrompt,
      ...((modelSettings as Record<string, unknown>) ?? {}),
    });

    return result.text;
  },
});
