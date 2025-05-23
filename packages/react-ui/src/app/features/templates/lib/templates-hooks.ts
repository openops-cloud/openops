import { BlockCategory, FlagId, FlowTemplateMetadata } from '@openops/shared';
import { useQuery } from '@tanstack/react-query';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { QueryKeys } from '@/app/constants/query-keys';
import { blocksHooks } from '@/app/features/blocks/lib/blocks-hook';
import {
  GetTemplatesParams,
  templatesApi,
} from '@/app/features/templates/lib/templates-api';
import { BlockMetadataModelSummary } from '@openops/blocks-framework';
import { FlowTemplateMetadataWithIntegrations } from '@openops/components/ui';
import { AxiosError } from 'axios';
import { useMemo } from 'react';
import { cloudTemplatesApi } from './cloud-templates-api';

type TemplateStrategyParams = {
  useCloudTemplates: boolean;
  enabled: boolean;
};

/**
 * Determines how the `gettingStarted` flag affects filtering.
 *
 * - `only`: Narrows results to only include templates where `gettingStarted` is `true`.
 * - `exclude`: Excludes templates where `gettingStarted` is `true`.
 * - `include` (or if not specified): Results will contain `gettingStarted` templates but will not be restricted to them.
 */
type GettingStartedTemplateFilter = 'only' | 'include' | 'exclude';

type TemplateBaseParams = TemplateStrategyParams & {
  gettingStartedTemplateFilter: GettingStartedTemplateFilter;
};

type UseTemplatesParams = GetTemplatesParams & TemplateBaseParams;

const TEMPLATES_FAILURE_RETRY_LIMIT = 3;

export const templatesHooks = {
  useTemplates: ({
    useCloudTemplates = false,
    enabled = true,
    search = '',
    services = [],
    domains = [],
    blocks = [],
    tags = [],
    gettingStartedTemplateFilter: gettingStarted = 'include',
  }: UseTemplatesParams) => {
    const version = flagsHooks.useFlag<string>(FlagId.CURRENT_VERSION).data;
    const templatesApiToUse = useCloudTemplates
      ? cloudTemplatesApi
      : templatesApi;

    return useQuery<FlowTemplateMetadata[], Error>({
      queryKey: [
        QueryKeys.flowTemplates,
        search,
        ...services,
        ...domains,
        ...blocks,
        ...tags,
        gettingStarted,
      ],
      retry: (failureCount, error) => {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 401) return false;
        return failureCount < TEMPLATES_FAILURE_RETRY_LIMIT;
      },
      queryFn: async () => {
        return (
          await templatesApiToUse.list({
            search,
            services,
            domains,
            blocks,
            tags,
            version: version ?? undefined,
          })
        ).filter(
          (template: FlowTemplateMetadata) =>
            gettingStarted === 'include' ||
            (gettingStarted === 'only' && template.isGettingStarted) ||
            (gettingStarted === 'exclude' && !template.isGettingStarted),
        );
      },
      enabled,
    });
  },
  useTemplateFilters: ({
    enabled = true,
    useCloudTemplates = false,
    gettingStartedTemplateFilter,
  }: TemplateBaseParams): {
    domains: string[];
    services: string[];
    isLoading: boolean;
    status: 'error' | 'success' | 'pending';
    isError: boolean;
  } => {
    const {
      data: templates,
      isLoading,
      status,
      isError,
    } = templatesHooks.useTemplates({
      enabled,
      useCloudTemplates,
      gettingStartedTemplateFilter,
    });
    const [uniqueDomains, uniqueServices] = useMemo(() => {
      const uniqueDomainsSet = new Set<string>();
      const uniqueServicesSet = new Set<string>();

      templates?.forEach((item) => {
        item.domains.forEach((domain) => uniqueDomainsSet.add(domain));
        item.services.forEach((service) => uniqueServicesSet.add(service));
      });

      return [
        Array.from(uniqueDomainsSet).sort(),
        Array.from(uniqueServicesSet).sort(),
      ];
    }, [templates]);

    return {
      domains: uniqueDomains,
      services: uniqueServices,
      isLoading,
      status,
      isError,
    };
  },

  useBlocksLookup: () => {
    const { blocks: blocksMetadata, isLoading } = blocksHooks.useBlocks({
      searchQuery: '',
    });

    const blocksLookup = useMemo(() => {
      if (!blocksMetadata) return {};
      return blocksMetadata.reduce<Record<string, BlockMetadataModelSummary>>(
        (map, blockMetadata) => {
          if (!blockMetadata.categories?.includes(BlockCategory.CORE)) {
            map[blockMetadata.name] = blockMetadata;
          }
          return map;
        },
        {},
      );
    }, [blocksMetadata]);

    return { blocksLookup, isLoading };
  },

  useTemplatesMetadataWithIntegrations: ({
    enabled = true,
    useCloudTemplates = false,
    search = '',
    services = [],
    domains = [],
    blocks = [],
    tags = [],
    gettingStartedTemplateFilter,
  }: UseTemplatesParams & {
    gettingStartedTemplateFilter: GettingStartedTemplateFilter;
  }) => {
    const {
      data: templates,
      isLoading: isTemplatesLoading,
      refetch,
    } = templatesHooks.useTemplates({
      useCloudTemplates,
      enabled,
      search,
      services,
      domains,
      blocks,
      tags,
      gettingStartedTemplateFilter,
    });
    const { blocksLookup, isLoading: isBlocksLoading } =
      templatesHooks.useBlocksLookup();

    const templatesWithIntegrations = useMemo(() => {
      if (!templates) return [];
      return templates.map((template) => ({
        ...template,
        integrations: (template.blocks ?? [])
          .map((blockName) => blocksLookup[blockName])
          .filter(Boolean),
      }));
    }, [templates, blocksLookup]);

    return {
      templatesWithIntegrations,
      isLoading: isTemplatesLoading ?? isBlocksLoading,
      refetch,
    };
  },

  useSetTemplateIntegrations: (template: FlowTemplateMetadata | null) => {
    const { blocksLookup, isLoading: isBlocksLoading } =
      templatesHooks.useBlocksLookup();

    const templateWithIntegrations: FlowTemplateMetadataWithIntegrations | null =
      useMemo(() => {
        if (!template) return null;
        return {
          ...template,
          integrations: (template.blocks ?? [])
            .map((blockName) => blocksLookup[blockName])
            .filter(Boolean),
        };
      }, [template, blocksLookup]);

    return { templateWithIntegrations, isLoading: isBlocksLoading };
  },
};
