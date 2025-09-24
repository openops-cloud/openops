/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from '@openops/server-shared';
import { ModelMessage, ToolResultPart, ToolSet, UIMessage } from 'ai';
import { FastifyReply } from 'fastify';

function isToolMessage(msg: ModelMessage): boolean {
  return (
    msg.role === 'tool' && Array.isArray(msg.content) && msg.content.length > 0
  );
}

/**
 * Converts a single message to UI format
 */
function convertMessageToUI(
  message: ModelMessage,
  tools?: ToolSet,
): Omit<UIMessage, 'id'> | null {
  switch (message.role) {
    case 'system':
      return {
        role: 'system',
        parts: [
          {
            type: 'text',
            text: typeof message.content === 'string' ? message.content : '',
            state: 'done',
          },
        ],
      };

    case 'user':
      return {
        role: 'user',
        parts: convertUserMessageContentToUI(
          message.content,
          message.providerOptions,
        ),
      };

    case 'assistant':
      return {
        role: 'assistant',
        parts: convertAssistantMessageContentToUI(
          message.content,
          tools,
          message.providerOptions,
        ),
      };

    default:
      return null;
  }
}

/**
 * Converts user message content to UI parts
 */
function convertUserMessageContentToUI(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: string | any[],
  providerOptions?: any,
): UIMessage['parts'] {
  const parts: UIMessage['parts'] = [];

  if (typeof content === 'string') {
    parts.push(createTextPartUI(content, providerOptions));
  } else if (Array.isArray(content)) {
    for (const part of content) {
      switch (part.type) {
        case 'text':
          parts.push(createTextPartUI(part.text, part.providerOptions));
          break;
        case 'file':
          parts.push(createFilePartUI(part, part.providerOptions));
          break;
        case 'image':
          parts.push(createImagePartUI(part, part.providerOptions));
          break;
        default:
          // Skip unsupported parts
          break;
      }
    }
  }

  return parts;
}

/**
 * Converts assistant message content to UI parts
 */
function convertAssistantMessageContentToUI(
  content: string | any[],
  tools?: ToolSet,
  providerOptions?: any,
): UIMessage['parts'] {
  const parts: UIMessage['parts'] = [];

  if (typeof content === 'string') {
    parts.push(createTextPartUI(content, providerOptions));
  } else if (Array.isArray(content)) {
    for (const part of content) {
      switch (part.type) {
        case 'text':
          parts.push(createTextPartUI(part.text, part.providerOptions));
          break;
        case 'file':
          parts.push(createFilePartUI(part, part.providerOptions));
          break;
        case 'image':
          parts.push(createImagePartUI(part, part.providerOptions));
          break;
        case 'reasoning':
          parts.push({
            type: 'reasoning',
            text: part.text,
            state: 'done',
            ...(part.providerOptions != null
              ? { providerMetadata: part.providerOptions }
              : {}),
          });
          break;
        case 'tool-call':
          parts.push(createToolCallPartUI(part, tools));
          break;
        default:
          // Skip unsupported parts
          break;
      }
    }
  }

  return parts;
}

/**
 * Creates a text part for UI
 */
function createTextPartUI(
  text: string,
  providerOptions?: any,
): UIMessage['parts'][0] {
  return {
    type: 'text',
    text,
    state: 'done',
    ...(providerOptions != null ? { providerMetadata: providerOptions } : {}),
  };
}

/**
 * Creates a file part for UI
 */
function createFilePartUI(
  part: any,
  providerOptions?: any,
): UIMessage['parts'][0] {
  return {
    type: 'file',
    mediaType: part.mediaType,
    filename: part.filename,
    url: typeof part.data === 'string' ? part.data : part.data.toString(),
    ...(providerOptions != null ? { providerMetadata: providerOptions } : {}),
  };
}

/**
 * Creates an image part for UI
 */
function createImagePartUI(
  part: any,
  providerOptions?: any,
): UIMessage['parts'][0] {
  return {
    type: 'file',
    mediaType: part.mediaType ?? 'image/jpeg',
    url: typeof part.image === 'string' ? part.image : part.image.toString(),
    ...(providerOptions != null ? { providerMetadata: providerOptions } : {}),
  };
}

/**
 * Creates a tool call part for UI
 */
function createToolCallPartUI(
  part: any,
  tools?: ToolSet,
): UIMessage['parts'][0] {
  const toolName = part.toolName;
  const tool = tools?.[toolName];
  const rawOutput = part.output ?? part.result;
  const hasOutput = rawOutput != null;
  const normalizedOutput =
    rawOutput != null && typeof rawOutput === 'object' && 'value' in rawOutput
      ? rawOutput.value
      : rawOutput;

  const base: any = {
    toolCallId: part.toolCallId,
    state: hasOutput
      ? ('output-available' as const)
      : ('input-available' as const),
    input: part.input as Record<string, unknown>,
    ...(hasOutput ? { output: normalizedOutput } : {}),
    ...(part.providerOptions != null
      ? { callProviderMetadata: part.providerOptions }
      : {}),
  };

  if (tool) {
    base.type = `tool-${toolName}` as any;
    base.providerExecuted = part.providerExecuted;
  } else {
    base.type = 'dynamic-tool' as const;
    base.toolName = toolName;
  }

  return base as UIMessage['parts'][0];
}

/**
 * Merges tool result into the corresponding assistant UI message
 */
function mergeToolResultIntoUIMessage(
  toolResult: ToolResultPart,
  uiMessages: Array<Omit<UIMessage, 'id'>>,
): boolean {
  for (let j = uiMessages.length - 1; j >= 0; j--) {
    const prev = uiMessages[j];
    if (prev.role === 'assistant') {
      const toolCallPart = prev.parts.find(
        (part) =>
          (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) &&
          (part as any).toolCallId === toolResult.toolCallId,
      );
      if (toolCallPart) {
        (toolCallPart as any).state = 'output-available';
        const raw = (toolResult as any).output ?? (toolResult as any).result;
        const normalized =
          raw != null && typeof raw === 'object' && 'value' in raw
            ? raw.value
            : raw;
        (toolCallPart as any).output = normalized;
        return true;
      }
    }
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
type Task = () => void | Promise<unknown>;

/**
 * Creates a Fastify-compatible equivalent of Next.js `after()`.
 *
 * This utility lets you queue asynchronous tasks to run **after**
 * the HTTP response has been sent to the client.
 */
export function makeAfter(reply: FastifyReply) {
  const tasks: Task[] = [];
  let ran = false;

  const run = (): void => {
    if (ran) return;
    ran = true;
    for (const fn of tasks) {
      // start after response lifecycle without blocking the response
      queueMicrotask(() => {
        Promise.resolve()
          .then(fn)
          .catch((err) => logger.error(err));
      });
    }
  };

  // Fire when the response is fully flushed…
  reply.raw.once('finish', run);
  // …optionally also when the connection closes early (drop this if undesired)
  reply.raw.once('close', run);

  // Return the Next.js-like sink
  return (fn: Task): void => {
    if (ran) {
      // If called after finish/close, run immediately (Next.js `after` behaves similarly)
      Promise.resolve()
        .then(fn)
        .catch((err) => logger.error(err));
    } else {
      tasks.push(fn);
    }
  };
}

/**
 * Creates a waitUntil function compatible with resumable-stream.
 * This function adapts Next.js `after()` behavior to work with resumable-stream.
 * It takes a promise and schedules it to run after the response has been sent.
 */
export function makeWaitUntil(
  reply: FastifyReply,
): (promise: Promise<unknown>) => void {
  const after = makeAfter(reply);

  return (promise: Promise<unknown>) => {
    after(() => promise);
  };
}

/**
 * Creates a Response wrapper that adds heartbeat to SSE streams.
 * This works by intercepting the Response body and adding heartbeat comments.
 */
export function createHeartbeatResponseWrapper(
  intervalMs = 15000,
): (response: Response) => Response {
  return (response: Response): Response => {
    if (!response.body) {
      return response;
    }

    let heartbeatInterval: NodeJS.Timeout | null = null;
    let isStreamActive = true;

    const originalStream = response.body;
    const heartbeatStream = new ReadableStream({
      start(controller): void {
        // Start heartbeat
        heartbeatInterval = setInterval(() => {
          if (isStreamActive) {
            try {
              // Send SSE heartbeat comment
              const encoder = new TextEncoder();
              controller.enqueue(encoder.encode(': heartbeat\n\n'));
            } catch (error) {
              // Stream is closed, stop heartbeat
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
              }
            }
          }
        }, intervalMs);

        // Forward the original stream
        const reader = originalStream.getReader();

        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              isStreamActive = false;
              if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
              }
              controller.close();
              return;
            }

            controller.enqueue(value);
            return pump();
          });
        }

        void pump().catch((error) => {
          isStreamActive = false;
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          controller.error(error);
        });
      },
      cancel(): void {
        isStreamActive = false;
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        originalStream.cancel();
      },
    });

    return new Response(heartbeatStream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}
