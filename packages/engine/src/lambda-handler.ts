import { logger, runWithLogContext, sendLogs } from '@openops/server-shared';
import { EngineResponseStatus } from '@openops/shared';
import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { nanoid } from 'nanoid';
import { executeEngine } from './engine-executor';
import { EngineRequest } from './main';

export async function lambdaHandler(
  event: APIGatewayEvent,
  context: Context,
): Promise<APIGatewayProxyResult | undefined> {
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: EngineResponseStatus.ERROR,
        message: 'The request body is empty.',
      }),
    };
  }

  const data = await parseJson<EngineRequest>(event.body);

  return runWithLogContext<APIGatewayProxyResult | undefined>(
    {
      requestId: event.headers.requestId ?? nanoid(),
      awsRequestId: context.awsRequestId,
      operationType: data.operationType,
    },
    () => handleEvent(data),
  );
}

async function handleEvent(
  data: EngineRequest,
): Promise<APIGatewayProxyResult | undefined> {
  try {
    logger.info('Request received in the engine.');

    if (!data.engineInput) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          status: EngineResponseStatus.ERROR,
          message: 'The received input is not valid.',
        }),
      };
    }

    const result = await executeEngine(data.engineInput, data.operationType);

    await sendLogs();

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    logger.error('Engine execution failed.', { error });

    await sendLogs();

    return {
      statusCode: 500,
      body: JSON.stringify({
        status: EngineResponseStatus.ERROR,
        message: 'Engine execution failed.',
      }),
    };
  }
}

async function parseJson<T>(jsonString: string): Promise<T> {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    throw Error((e as Error).message);
  }
}
