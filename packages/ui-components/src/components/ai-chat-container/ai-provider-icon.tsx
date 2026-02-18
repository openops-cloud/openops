import { AiProviderEnum } from '@openops/shared';
import { Bot } from 'lucide-react';
import AnthropicIcon from '../../icons/anthropic.icon';
import CerebrasIcon from '../../icons/cerebras.icon';
import CohereIcon from '../../icons/cohere.icon';
import DeepInfraIcon from '../../icons/deepinfra.icon';
import DeepSeekIcon from '../../icons/deepseek.icon';
import GeminiIcon from '../../icons/gemini.icon';
import GoogleIcon from '../../icons/google.icon';
import GrokIcon from '../../icons/grok.icon';
import MistralIcon from '../../icons/mistral.icon';
import OpenAiIcon from '../../icons/open-ai.icon';
import PerplexityIcon from '../../icons/perplexity.icon';
import TogetherAiIcon from '../../icons/together-ai.icon';
import { cn } from '../../lib/cn';

interface AiProviderIconProps {
  provider?: string;
  className?: string;
  size?: number;
}

const AiProviderIcon = ({
  provider,
  className,
  size = 16,
}: AiProviderIconProps) => {
  const iconProps = {
    size,
    className: cn('shrink-0', className),
  };

  switch (provider) {
    case AiProviderEnum.OPENAI:
    case AiProviderEnum.AZURE_OPENAI:
      return <OpenAiIcon {...iconProps} />;
    case AiProviderEnum.ANTHROPIC:
      return <AnthropicIcon {...iconProps} />;
    case AiProviderEnum.GOOGLE:
      return <GeminiIcon {...iconProps} />;
    case AiProviderEnum.GOOGLE_VERTEX:
      return <GoogleIcon {...iconProps} />;
    case AiProviderEnum.MISTRAL:
      return <MistralIcon {...iconProps} />;
    case AiProviderEnum.GROQ:
    case AiProviderEnum.XAI:
      return <GrokIcon {...iconProps} />;
    case AiProviderEnum.DEEPSEEK:
      return <DeepSeekIcon {...iconProps} />;
    case AiProviderEnum.PERPLEXITY:
      return <PerplexityIcon {...iconProps} />;
    case AiProviderEnum.COHERE:
      return <CohereIcon {...iconProps} />;
    case AiProviderEnum.CEREBRAS:
      return <CerebrasIcon {...iconProps} />;
    case AiProviderEnum.DEEPINFRA:
      return <DeepInfraIcon {...iconProps} />;
    case AiProviderEnum.TOGETHER_AI:
      return <TogetherAiIcon {...iconProps} />;
    default:
      return <Bot {...iconProps} />;
  }
};

export { AiProviderIcon };
