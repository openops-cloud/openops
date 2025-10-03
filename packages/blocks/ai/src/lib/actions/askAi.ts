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
import { AiProviderEnum, analysisLLMSchema } from '@openops/shared';
import { generateObject } from 'ai';

export const askAi = createAction({
  displayName: 'Ask AI',
  description:
    'Ask AI a question or transform input using an LLM based on a prompt',
  name: 'analyze',
  requireToolApproval: false,
  props: {
    prompt: Property.LongText({
      displayName: 'Prompt',
      required: true,
    }),
    additionalInput: Property.Array({
      displayName: 'Additional input',
      description: 'Array of inputs to use for analysis or transformation',
      required: false,
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

    const additionalInput =
      context.propsValue.additionalInput?.map((inputItem) =>
        JSON.stringify(inputItem),
      ) ?? [];
    const composedPrompt =
      context.propsValue.prompt +
      (additionalInput?.length > 0
        ? `\n\nAdditional Input:\n${additionalInput.join(',')}`
        : '');

    const result = await generateObject({
      model: languageModel,
      prompt: composedPrompt,
      schema: analysisLLMSchema,
      ...((modelSettings as Record<string, unknown>) ?? {}),
    });
    return result.object;
  },
});
