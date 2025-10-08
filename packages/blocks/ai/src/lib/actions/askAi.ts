import {
  createAction,
  DynamicPropsValue,
  Property,
} from '@openops/blocks-framework';
import {
  aiAuth,
  getAiModelFromConnection,
  getAiProvider,
  getAiProviderLanguageModel,
  getLLMTelemetryConfig,
  isLLMTelemetryEnabled,
} from '@openops/common';
import { AiProviderEnum, analysisLLMSchema } from '@openops/shared';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SpanExporter } from '@opentelemetry/sdk-trace-base';
import { generateObject } from 'ai';
import { LangfuseExporter } from 'langfuse-vercel';

export const askAi = createAction({
  displayName: 'Ask AI',
  description:
    'Ask AI a question or transform input using an LLM based on a prompt',
  name: 'analyze',
  auth: aiAuth,
  requireToolApproval: false,
  props: {
    model: Property.DynamicProperties({
      displayName: 'Model',
      required: false,
      refreshers: ['auth'],
      props: async ({ auth }) => {
        const fields: DynamicPropsValue = {};
        if (!auth) {
          return fields;
        }
        const authValue = auth as {
          provider: AiProviderEnum;
          model: string;
          customModel?: string;
        };
        const provider = authValue.provider;
        const aiProvider = getAiProvider(provider);

        if (!aiProvider.models || aiProvider.models.length === 0) {
          fields['model'] = Property.ShortText({
            displayName: 'Model',
            required: true,
            defaultValue: authValue.customModel || authValue.model,
          });
          return fields;
        }

        fields['model'] = Property.StaticDropdown<string>({
          displayName: 'Model',
          required: true,
          options: {
            disabled: false,
            options: aiProvider.models.map((m) => ({ label: m, value: m })),
          },
          defaultValue: authValue.model,
        });
        return fields;
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
    let telemetrySDK: NodeSDK | undefined;
    if (isLLMTelemetryEnabled()) {
      telemetrySDK = new NodeSDK({
        traceExporter: new LangfuseExporter({
          ...getLLMTelemetryConfig(),
        }) as unknown as SpanExporter,
        instrumentations: [getNodeAutoInstrumentations()],
      });
      await telemetrySDK.start();
    }

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

    const overridenModel = (
      context.propsValue.model as { model?: string } | undefined
    )?.model as string | undefined;
    const model =
      overridenModel || getAiModelFromConnection(auth.model, auth.customModel);

    const languageModel = await getAiProviderLanguageModel({
      provider: provider,
      apiKey: apiKey,
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
      experimental_telemetry: { isEnabled: isLLMTelemetryEnabled() },
    });
    telemetrySDK?.shutdown();

    return result.object;
  },
});
