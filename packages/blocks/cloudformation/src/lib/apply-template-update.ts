import {
  CloudFormationClient,
  UpdateStackCommand,
  UpdateStackCommandOutput,
  waitUntilStackUpdateComplete,
} from '@aws-sdk/client-cloudformation';
import { AwsCredentials, getAwsClient } from '@openops/common';
import { logger } from '@openops/server-shared';

export async function applyTemplateUpdate(
  credentials: AwsCredentials,
  region: string,
  arn: string,
  template: string,
  waitForInSeconds?: number,
): Promise<UpdateStackCommandOutput> {
  const client = getAwsClient(
    CloudFormationClient,
    credentials,
    region,
  ) as CloudFormationClient;

  const command = new UpdateStackCommand({
    StackName: arn,
    TemplateBody: template,
  });

  const response = await client.send(command);

  if (!response.StackId) {
    const message = `No template found for stack: ${arn}`;
    logger.warn(message, { response, arn });
    throw new Error(message);
  }

  if (waitForInSeconds) {
    await waitUntilStackUpdateComplete(
      { client, maxWaitTime: waitForInSeconds, minDelay: 1 },
      { StackName: arn },
    );
  }

  return response;
}
