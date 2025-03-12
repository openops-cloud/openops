import {
  FlowOperationType,
  TemplateType,
  flowHelper,
  openOpsId,
} from '@openops/shared';
import { compare, validate } from 'compare-versions';
import { Brackets } from 'typeorm';
import { repoFactory } from '../core/db/repo-factory';
import { flowService } from '../flows/flow/flow.service';
import { FlowTemplateEntity, FlowTemplateSchema } from './flow-template.entity';

const flowTemplateRepo = repoFactory(FlowTemplateEntity);

export type flowTemplateQueryParams = {
  search?: string;
  tags?: string[];
  services?: string[];
  domains?: string[];
  blocks?: string[];
  pieces?: string[];
  projectId: string;
  organizationId: string;
  cloudTemplates?: boolean;
  isSample?: boolean;
  version?: string;
};

type createFlowTemplateParams = {
  flowId: string;
  tags?: string[];
  services?: string[];
  domains?: string[];
  organizationId: string;
  projectId: string;
  type?: string;
  isSample?: boolean;
  isGettingStarted?: boolean;
  minVersion?: string;
  maxVersion?: string;
};

export const flowTemplateService = {
  async getFlowTemplates(
    queryParams: flowTemplateQueryParams,
  ): Promise<FlowTemplateSchema[]> {
    let queryBuilder = flowTemplateRepo()
      .createQueryBuilder('flow_template')
      .select([
        // everything but the actual template
        'flow_template.id',
        'flow_template.created',
        'flow_template.updated',
        'flow_template.name',
        'flow_template.description',
        'flow_template.type',
        'flow_template.tags',
        'flow_template.services',
        'flow_template.domains',
        'flow_template.blocks',
        'flow_template.pieces',
        'flow_template.projectId',
        'flow_template.organizationId',
        'flow_template.isSample',
        'flow_template.isGettingStarted',
        'flow_template.minSupportedVersion',
        'flow_template.maxSupportedVersion',
      ]);
    if (queryParams.search) {
      queryBuilder = queryBuilder.andWhere(
        new Brackets((qb) =>
          qb
            .where('name ILIKE :search', { search: `%${queryParams.search}%` })
            .orWhere('description ILIKE :search', {
              search: `%${queryParams.search}%`,
            }),
        ),
      );
    }

    if (queryParams.services) {
      queryBuilder = queryBuilder.andWhere('services @> :services', {
        services: JSON.stringify(queryParams.services),
      });
    }

    if (queryParams.domains) {
      queryBuilder = queryBuilder.andWhere('domains @> :domains', {
        domains: JSON.stringify(queryParams.domains),
      });
    }

    if (queryParams.tags) {
      queryBuilder = queryBuilder.andWhere('tags @> :tags', {
        tags: JSON.stringify(queryParams.tags),
      });
    }

    if (queryParams.blocks) {
      queryBuilder = queryBuilder.andWhere('blocks @> :blocks', {
        blocks: JSON.stringify(queryParams.blocks),
      });
    }

    if (queryParams.pieces) {
      queryBuilder = queryBuilder.andWhere('pieces @> :pieces', {
        pieces: JSON.stringify(queryParams.pieces),
      });
    }

    if (queryParams.isSample) {
      queryBuilder = queryBuilder.andWhere(
        '("isSample" = true OR "isGettingStarted" = true)',
      );
    }

    if (!queryParams.cloudTemplates) {
      queryBuilder = queryBuilder.andWhere(
        new Brackets((qb) =>
          qb
            .where(
              new Brackets((sqb) =>
                sqb
                  .where('"projectId" = :projectId', {
                    projectId: queryParams.projectId,
                  })
                  .andWhere(`type = '${TemplateType.PROJECT}'`),
              ),
            )
            .orWhere(
              new Brackets((sqb) =>
                sqb
                  .where('"organizationId" = :organizationId', {
                    organizationId: queryParams.organizationId,
                  })
                  .andWhere(`type = '${TemplateType.ORGANIZATION}'`),
              ),
            ),
        ),
      );
    }

    const templates = await queryBuilder.getMany();

    return filterTemplatesByVersion(templates, queryParams.version);
  },
  getFlowTemplate(id: string): Promise<FlowTemplateSchema | null> {
    return flowTemplateRepo().findOneBy({ id });
  },
  async createFlowTemplate(requestOptions: createFlowTemplateParams) {
    const flow = await flowService.getOnePopulatedOrThrow({
      id: requestOptions.flowId,
      projectId: requestOptions.projectId,
    });

    return flowTemplateRepo().save({
      id: openOpsId(),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      name: flow.version?.displayName,
      description: flow.version?.description ?? '',
      type: TemplateType.ORGANIZATION,
      tags: requestOptions.tags ?? [],
      services: requestOptions.services ?? [],
      domains: requestOptions.domains ?? [],
      blocks: flowHelper.getUsedBlocks(flow.version.trigger),
      template: flowHelper.apply(flow.version, {
        type: FlowOperationType.REMOVE_CONNECTIONS,
        request: null,
      }).trigger,
      projectId: requestOptions.projectId,
      organizationId: requestOptions.organizationId,
      isSample: requestOptions.isSample,
      isGettingStarted: requestOptions.isGettingStarted,
      minSupportedVersion: requestOptions.minVersion,
      maxSupportedVersion: requestOptions.maxVersion,
    });
  },
};

export function filterTemplatesByVersion(
  templates: FlowTemplateSchema[],
  version: string | undefined,
) {
  if (version && !validate(version)) {
    return templates.filter(
      (template) =>
        template.minSupportedVersion && !template.maxSupportedVersion,
    );
  }

  return templates.filter((template) => {
    if (!version) {
      return !template.minSupportedVersion && !template.maxSupportedVersion;
    }

    const meetsMin = template.minSupportedVersion
      ? compare(version, template.minSupportedVersion, '>=')
      : false;
    const meetsMax = template.maxSupportedVersion
      ? compare(version, template.maxSupportedVersion, '<=')
      : true;

    return meetsMin && meetsMax;
  });
}
