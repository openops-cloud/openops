import {
  InstanceRecommendation as AwsRecommendation,
  ComputeOptimizerClient,
  Finding,
  GetEC2InstanceRecommendationsCommand,
  GetEC2InstanceRecommendationsCommandInput,
  GetEC2InstanceRecommendationsCommandOutput,
} from '@aws-sdk/client-compute-optimizer';
import { _InstanceType } from '@aws-sdk/client-ec2';
import { getResourceIdFromArn, makeAwsRequest } from '@openops/common';
import {
  filterOutRecommendationOptionsWithoutSavings,
  sortRecommendationOptionsByRank,
} from './filter-recommendations';
import {
  ComputeOptimizerRecommendation,
  getRecommendations,
} from './get-recommendations';
import { RecommendationsBuilder } from './recommendations-builder';

export class Ec2RecommendationsBuilder implements RecommendationsBuilder<
  Finding,
  AwsRecommendation
> {
  recommendationType: string;
  findingType: Finding;
  credentials: any;

  constructor(
    credentials: any,
    findingType: Finding,
    recommendationType: string,
  ) {
    this.credentials = credentials;
    this.findingType = findingType;
    this.recommendationType = recommendationType;
  }

  public getRecommendations(
    credentials: any,
    region: string,
    arns?: string[],
  ): Promise<ComputeOptimizerRecommendation[]> {
    return getRecommendations(this, credentials, region, arns);
  }

  public async makeRequest(
    client: ComputeOptimizerClient,
    filters: { filters: unknown[] },
    arns?: string[],
  ): Promise<{ result?: AwsRecommendation[] }> {
    const command = new GetEC2InstanceRecommendationsCommand({
      ...filters,
      instanceArns: arns,
    } as GetEC2InstanceRecommendationsCommandInput);

    const response: unknown[] = await makeAwsRequest(client, command);
    const instanceRecommendations: AwsRecommendation[] = response.flatMap(
      (r) =>
        (r as GetEC2InstanceRecommendationsCommandOutput)
          .instanceRecommendations ?? [],
    );

    return {
      result: instanceRecommendations,
    };
  }

  public getAccountId(resource: AwsRecommendation): string {
    if (resource.accountId) {
      return resource.accountId;
    }

    throw new Error('Resource accountId cannot be null');
  }

  public getResourceArn(resource: AwsRecommendation): string {
    if (resource.instanceArn) {
      return resource.instanceArn;
    }
    throw new Error('Resource arn cannot be null');
  }

  public createResourceObj(
    awsRecommendation: AwsRecommendation,
    region: string,
    accountName?: string,
  ): any {
    return {
      region: region,
      account_name: accountName,
      arn: awsRecommendation.instanceArn!,
      account_id: awsRecommendation.accountId!,
      displayName: awsRecommendation.instanceName,
      instance_id: getResourceIdFromArn(awsRecommendation.instanceArn!),
      instance_type: awsRecommendation.currentInstanceType! as _InstanceType,
    };
  }

  public createRecommendation(recommendation: AwsRecommendation): any {
    const optionsWithSavings = filterOutRecommendationOptionsWithoutSavings(
      recommendation.recommendationOptions!,
    );
    const sortedByRank = sortRecommendationOptionsByRank(optionsWithSavings);

    const result: any = {
      options: sortedByRank.map((option) => {
        return {
          monthlyPotentialSavings: {
            currency:
              option.savingsOpportunity?.estimatedMonthlySavings?.currency,
            value: option.savingsOpportunity?.estimatedMonthlySavings?.value,
          },
          details: {
            migrationEffort: option.migrationEffort!,
            performanceRisk: option.performanceRisk!,
            currentInstanceType: recommendation.currentInstanceType!,
            suggestedInstanceType: option.instanceType!,
          },
        };
      }),
      type: this.recommendationType,
    };

    return result;
  }
}
