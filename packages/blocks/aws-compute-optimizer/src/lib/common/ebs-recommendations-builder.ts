import {
  ComputeOptimizerClient,
  EBSFinding,
  GetEBSVolumeRecommendationsCommand,
  GetEBSVolumeRecommendationsCommandInput,
  GetEBSVolumeRecommendationsCommandOutput,
  VolumeRecommendation,
} from '@aws-sdk/client-compute-optimizer';
import { VolumeType } from '@aws-sdk/client-ec2';
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

export class EbsRecommendationsBuilder implements RecommendationsBuilder<
  EBSFinding,
  VolumeRecommendation
> {
  recommendationType: any;
  findingType: EBSFinding;
  credentials: any;

  constructor(
    credentials: any,
    findingType: EBSFinding,
    recommendationType: any,
  ) {
    this.recommendationType = recommendationType;
    this.credentials = credentials;
    this.findingType = findingType;
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
  ): Promise<{ result?: VolumeRecommendation[]; token?: string }> {
    const command = new GetEBSVolumeRecommendationsCommand({
      ...filters,
      volumeArns: arns,
    } as GetEBSVolumeRecommendationsCommandInput);

    const response: unknown[] = await makeAwsRequest(client, command);
    const volumeRecommendations: VolumeRecommendation[] = response.flatMap(
      (r) =>
        (r as GetEBSVolumeRecommendationsCommandOutput).volumeRecommendations ??
        [],
    );

    return {
      result: volumeRecommendations,
    };
  }

  public getAccountId(resource: VolumeRecommendation): string {
    if (resource.accountId) {
      return resource.accountId;
    }
    throw new Error('Resource accountId cannot be null');
  }

  public getResourceArn(resource: VolumeRecommendation): string {
    if (resource.volumeArn) {
      return resource.volumeArn;
    }
    throw new Error('Resource arn cannot be null');
  }

  public createResourceObj(
    volumeRecommendation: VolumeRecommendation,
    region: string,
    accountName?: string,
  ): any {
    return {
      region: region,
      account_name: accountName,
      arn: volumeRecommendation.volumeArn!,
      account_id: volumeRecommendation.accountId!,
      size: volumeRecommendation.currentConfiguration!.volumeSize!,
      volume_id: getResourceIdFromArn(volumeRecommendation.volumeArn!),
      displayName: volumeRecommendation.tags?.find((tag) => tag.key === 'Name')
        ?.value,
      volume_type: volumeRecommendation.currentConfiguration!
        .volumeType! as VolumeType,
    };
  }

  public createRecommendation(recommendation: VolumeRecommendation): any {
    const optionsWithSavings = filterOutRecommendationOptionsWithoutSavings(
      recommendation.volumeRecommendationOptions!,
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
            performanceRisk: option.performanceRisk!,
            currentConfiguration: recommendation.currentConfiguration!,
            suggestedConfiguration: option.configuration!,
          },
        };
      }),
      type: this.recommendationType,
    };

    return result;
  }
}
