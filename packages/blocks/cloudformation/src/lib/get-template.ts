import * as CloudFormation from '@aws-sdk/client-cloudformation';
import { AwsCredentials, getAwsClient } from '@openops/common';
import { logger } from '@openops/server-shared';

export async function getCloudFormationTemplate(
  credentials: AwsCredentials,
  region: string,
  arn: string,
): Promise<string> {
  const client = getAwsClient(
    CloudFormation.CloudFormationClient,
    credentials,
    region,
  ) as CloudFormation.CloudFormationClient;

  const command = new CloudFormation.GetTemplateCommand({ StackName: arn });

  const response = await client.send(command);

  if (!response.TemplateBody) {
    const message = `No template found for stack: ${arn}`;
    logger.warn(message, { response, arn });
    throw new Error(message);
  }

  return response.TemplateBody;
}
