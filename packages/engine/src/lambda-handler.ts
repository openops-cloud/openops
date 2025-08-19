/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BodyAccessKeyRequest,
  getRequestBody,
  logger,
  runWithLogContext,
  sendLogs,
} from '@openops/server-shared';
import { EngineResponseStatus } from '@openops/shared';
import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
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

  const data = await parseJson<BodyAccessKeyRequest>(event.body);

  let requestBody: EngineRequest;
  try {
    requestBody = await getRequestBody<EngineRequest>(data.bodyAccessKey);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        status: EngineResponseStatus.ERROR,
        message: (error as Error).message,
      }),
    };
  }

  return runWithLogContext<APIGatewayProxyResult | undefined>(
    {
      deadlineTimestamp: requestBody.deadlineTimestamp.toString(),
      operationType: requestBody.operationType,
      awsRequestId: context.awsRequestId,
      requestId: requestBody.requestId,
    },
    () => handleEvent(requestBody),
  );
}

async function handleEvent(
  requestBody: EngineRequest,
): Promise<APIGatewayProxyResult | undefined> {
  try {
    const { requestId, engineInput, operationType } = requestBody;

    logger.info(`Received request for operation [${operationType}]`, {
      operationType,
    });

    const responseKey = await executeEngine(
      requestId,
      engineInput,
      operationType,
    );

    await sendLogs();

    return {
      statusCode: 200,
      body: JSON.stringify({
        responseKey,
      }),
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
