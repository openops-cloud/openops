import { AppSystemProp, logger, system } from '@openops/server-shared';
import { AiConfig } from '@openops/shared';
import { APICallError, CoreMessage, generateText, LanguageModel } from 'ai';

function getHistoryMaxTokens(aiConfig: AiConfig): number {
  const modelMax = aiConfig.modelSettings?.maxTokens;
  if (typeof modelMax === 'number') {
    return modelMax;
  }

  return system.getNumberOrThrow(AppSystemProp.MAX_TOKENS_FOR_HISTORY_SUMMARY);
}

export async function summarizeChatHistory(
  existingMessages: CoreMessage[],
  languageModel: LanguageModel,
  aiConfig: AiConfig,
): Promise<CoreMessage[]> {
  const lastMessage = existingMessages.at(-1);

  const isLastMessageFromUser = lastMessage && lastMessage.role === 'user';
  const skipSummary = isLastMessageFromUser && existingMessages.length === 1;
  if (skipSummary) {
    return existingMessages;
  }

  const messagesForSummary = isLastMessageFromUser
    ? existingMessages.slice(0, -1)
    : existingMessages;

  try {
    logger.debug('Request chat history summary.');

    const summarizedHistory = await generateSummary(
      languageModel,
      messagesForSummary,
      aiConfig,
    );

    logger.debug('The chat history summary has been made.');

    return isLastMessageFromUser
      ? [...summarizedHistory, lastMessage]
      : summarizedHistory;
  } catch (error) {
    logger.error('Failed to obtain the chat history summary.', error);
    return existingMessages;
  }
}

async function generateSummary(
  languageModel: LanguageModel,
  messages: CoreMessage[],
  aiConfig: AiConfig,
): Promise<CoreMessage> {
  try {
    return await requestToGenerateSummary(languageModel, messages, aiConfig);
  } catch (error) {
    if (APICallError.isInstance(error)) {
      return retryWithTruncatedInteractions(languageModel, messages, aiConfig);
    }

    throw error;
  }
}

async function retryWithTruncatedInteractions(
  languageModel: LanguageModel,
  messages: CoreMessage[],
  aiConfig: AiConfig,
): Promise<CoreMessage> {
  const maxInteractions = system.getNumberOrThrow(
    AppSystemProp.MAX_USER_INTERACTIONS_FOR_SUMMARY,
  );

  const truncated = truncateByTheNumberOfUserInteractions(
    messages,
    maxInteractions,
  );

  return requestToGenerateSummary(languageModel, truncated, aiConfig);
}

async function requestToGenerateSummary(
  languageModel: LanguageModel,
  messages: CoreMessage[],
  aiConfig: AiConfig,
): Promise<CoreMessage> {
  const systemPrompt =
    'You are an expert at creating extremely concise conversation summaries. ' +
    'Focus only on the most important information, decisions, and context. ' +
    'Omit pleasantries, redundant information, and unnecessary details. ' +
    'Your summary should be as brief as possible while preserving all critical information.';

  const { text } = await generateText({
    messages,
    model: languageModel,
    system: systemPrompt,
    ...aiConfig.modelSettings,
    maxTokens: getHistoryMaxTokens(aiConfig),
  });

  return {
    role: 'system',
    content: `The following is a summary of the previous conversation: ${text}`,
  } as CoreMessage;
}

function truncateByTheNumberOfUserInteractions(
  messages: CoreMessage[],
  maxInteractions: number,
): CoreMessage[] {
  const result: CoreMessage[] = [];
  let userCount = 0;
  logger.debug(
    `Truncating chat history based on user interactions (maximum interactions: ${maxInteractions}).`,
  );

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    result.unshift(msg);

    if (msg.role === 'user') {
      userCount++;
      if (userCount === maxInteractions) {
        break;
      }
    }
  }

  return result;
}
