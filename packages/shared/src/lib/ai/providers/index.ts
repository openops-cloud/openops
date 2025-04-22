import { Static, Type } from '@sinclair/typebox';

export const GetProvidersResponse = Type.Object({
  provider: Type.String(),
  displayName: Type.String(),
  models: Type.Array(Type.String()),
});

export type GetProvidersResponse = Static<typeof GetProvidersResponse>;

export enum AiProviderEnum {
  AMAZON_BEDROCK = 'Amazon Bedrock',
  ANTHROPIC = 'Anthropic',
  AZURE_OPENAI = 'Azure OpenAI',
  CEREBRAS = 'Cerebras',
  COHERE = 'Cohere',
  DEEPINFRA = 'Deep Infra',
  DEEPSEEK = 'Deep Seek',
  GOOGLE = 'Google Generative AI',
  GROQ = 'Groq',
  LMNT = 'LMNT',
  MISTRAL = 'Mistral',
  OPENAI = 'OpenAI',
  OPENAI_COMPATIBLE = 'OpenAI Compatible',
  PERPLEXITY = 'Perplexity',
  TOGETHER_AI = 'Together.ai',
  XAI = 'xAI Grok',
}
