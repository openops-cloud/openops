import * as ArnParser from '@aws-sdk/util-arn-parser';
import { Property } from '@openops/blocks-framework';
import { convertToStringArrayWithValidation } from '@openops/shared';

export function getARNsProperty(
  arnLabel?: string,
  arnDescription?: string,
): any {
  return Property.Array({
    displayName: arnLabel ?? 'Resource ARNs',
    description:
      arnDescription ?? 'Resource ARNs for which to get recommendations.',
    required: true,
  });
}

export function convertToARNArrayWithValidation(
  input: any,
): [string, ...string[]] {
  return convertToStringArrayWithValidation(
    input,
    'Input should be a single ARN or an array of ARNs',
  );
}

export function getResourceIdFromArn(arn: string): string {
  return parseArn(arn).resourceId;
}

type ArnBuildOptions = {
  service: string;
  region: string;
  accountId: string;
  resource: string;
};

export function buildArn(buildOptions: ArnBuildOptions): string {
  return ArnParser.build(buildOptions);
}

export function parseArn(arn: string): {
  accountId: string;
  resourceId: string;
  region: string;
  service: string;
  partition: string;
} {
  const arnObj = ArnParser.parse(arn);

  const resourceFields = arnObj.resource.split(/[:/]/);

  const resourceId =
    resourceFields.length >= 2
      ? resourceFields[resourceFields.length - 1]
      : arnObj.resource;

  return {
    resourceId,
    accountId: arnObj.accountId,
    region: arnObj.region,
    service: arnObj.service,
    partition: arnObj.partition,
  };
}

export function groupARNsByAccount(arns: string[]): Record<string, string[]> {
  return arns.reduce((acc, arn) => {
    const { accountId } = parseArn(arn);
    if (!acc[accountId]) {
      acc[accountId] = [];
    }
    acc[accountId].push(arn);
    return acc;
  }, {} as Record<string, string[]>);
}
