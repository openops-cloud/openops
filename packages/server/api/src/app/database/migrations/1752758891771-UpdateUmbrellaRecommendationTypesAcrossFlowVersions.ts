import { logger } from '@openops/server-shared';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { applyUpdateToFlowVersion } from './common/apply-update-to-flow-version';

export class UpdateUmbrellaRecommendationTypesAcrossFlowVersions1752758891771
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.info(
      'UpdateUmbrellaRecommendationTypesAcrossFlowVersions1752758891771: starting',
    );

    await applyUpdateToFlowVersion(queryRunner, updateJsonObject);

    logger.info(
      'UpdateUmbrellaRecommendationTypesAcrossFlowVersions1752758891771: completed',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('Rollback not implemented');
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function updateJsonObject(obj: any): void {
  if (
    obj.settings?.blockName === '@openops/block-anodot' &&
    obj.settings?.actionName === 'get_recommendations_predefined' &&
    obj.settings?.input?.recommendationType !== undefined
  ) {
    obj.settings.input.recommendationTypes =
      obj.settings?.input?.recommendationType?.filters?.type_id || [];
  }
}
