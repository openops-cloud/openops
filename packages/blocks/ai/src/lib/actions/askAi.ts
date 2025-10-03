import { createAction, Property } from '@openops/blocks-framework';
import {
  aiAuth,
  getAiModelFromConnection,
  getAiProvider,
  getAiProviderLanguageModel,
} from '@openops/common';
import { AiProviderEnum, analysisLLMSchema } from '@openops/shared';
import { generateObject } from 'ai';

export const askAi = createAction({
  displayName: 'Ask AI',
  description:
    'Ask AI a question or transform input using an LLM based on a prompt',
  name: 'analyze',
  auth: aiAuth,
  requireToolApproval: false,
  props: {
    model: Property.Dropdown<string, false>({
      displayName: 'Model',
      required: false,
      refreshers: ['auth'],
      options: async ({ auth }) => {
        if (!auth) {
          return {
            disabled: true,
            options: [],
            placeholder: 'Connect your AI provider to choose a model',
          };
        }
        const authValue = auth as {
          provider: AiProviderEnum;
        };
        const provider = authValue.provider as AiProviderEnum;
        const aiProvider = getAiProvider(provider);
        return {
          disabled: false,
          options: aiProvider.models.map((m) => ({ label: m, value: m })),
        };
      },
    }),
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
    const auth = context.auth as {
      provider: AiProviderEnum;
      apiKey: string;
      baseURL?: string;
      providerSettings?: Record<string, unknown>;
      modelSettings?: Record<string, unknown>;
      model: string;
      customModel?: string;
    };
    const { provider, apiKey, baseURL, providerSettings, modelSettings } = auth;

    const overrideModel = context.propsValue.model as string | undefined;
    const model = overrideModel
      ? overrideModel
      : getAiModelFromConnection(auth.model, auth.customModel);

    const languageModel = await getAiProviderLanguageModel({
      provider: provider as AiProviderEnum,
      apiKey: apiKey as string,
      model: model as string,
      providerSettings: {
        ...((providerSettings as Record<string, unknown>) ?? {}),
        ...(baseURL ? { baseURL } : {}),
      },
    });

    const additionalInput = context.propsValue.additionalInput ?? [];
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
