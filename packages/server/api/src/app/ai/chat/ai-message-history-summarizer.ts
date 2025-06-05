import { AppSystemProp, logger, system } from '@openops/server-shared';
import { AiConfig } from '@openops/shared';
import { APICallError, CoreMessage, generateText, LanguageModel } from 'ai';
import { appendMessagesToChatHistoryContext } from './ai-chat.service';

function getHistoryMaxTokens(aiConfig: AiConfig): number {
  const modelMax = aiConfig.modelSettings?.maxTokens;
  if (typeof modelMax === 'number') {
    return modelMax;
  }

  return system.getNumberOrThrow(AppSystemProp.MAX_TOKENS_FOR_HISTORY_SUMMARY);
}

export function shouldTryToSummarize(
  message: string,
  attemptIndex: number,
): boolean {
  return message.includes('tokens') && attemptIndex < 2;
}

export async function summarizeChatHistoryContext(
  languageModel: LanguageModel,
  aiConfig: AiConfig,
  chatId: string,
): Promise<CoreMessage[]> {
  return appendMessagesToChatHistoryContext(
    chatId,
    [],
    async (existingMessages) => {
      let reAdd = false;
      let lastMessage = existingMessages.at(-1);
      if (lastMessage && lastMessage.role === 'user') {
        if (existingMessages.length === 1) {
          return existingMessages;
        }
        lastMessage = existingMessages.pop();
        reAdd = true;
      }

      try {
        logger.debug('Request chat history summary.');

        const summary = await requestToGenerateSummary(
          languageModel,
          existingMessages,
          aiConfig,
        );

        if (lastMessage && reAdd) {
          summary.push(lastMessage);
        }

        logger.debug('The chat history summary has been made.');

        return summary;
      } catch (error) {
        logger.error('Failed to obtain the chat history summary.', error);
        return existingMessages;
      }
    },
  );
}

async function requestToGenerateSummary(
  languageModel: LanguageModel,
  messages: CoreMessage[],
  aiConfig: AiConfig,
  attemptIndex = 0,
): Promise<CoreMessage[]> {
  try {
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

    return [
      {
        role: 'system',
        content: `The following is a summary of the previous conversation: ${text}`,
      },
    ];
  } catch (error) {
    if (attemptIndex < 1 && APICallError.isInstance(error)) {
      const maxInteractions = system.getNumberOrThrow(
        AppSystemProp.MAX_USER_INTERACTIONS_FOR_SUMMARY,
      );

      const truncated = truncateByTheNumberOfUserInteractions(
        messages,
        maxInteractions,
      );

      attemptIndex += 1;
      return requestToGenerateSummary(
        languageModel,
        truncated,
        aiConfig,
        attemptIndex,
      );
    }

    throw error;
  }
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
