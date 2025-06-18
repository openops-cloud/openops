import { QueryKeys } from '@/app/constants/query-keys';
import { McpConfig } from '@openops/shared';
import { MutationOptions, useMutation, useQuery } from '@tanstack/react-query';
import {
  mapFormSchemaToMcpConfigs,
  mapMcpConfigsToFormSchema,
  McpSettingsFormSchema,
} from './mcp-form-utils';
import { mcpSettingsApi } from './mcp-settings-api';

export const mcpSettingsHooks = {
  useMcpSettings: () => {
    return useQuery<McpSettingsFormSchema, Error>({
      queryKey: [QueryKeys.mcpSettings],
      queryFn: async () => {
        const mcpSettings = await mcpSettingsApi.getMcpSettings();
        return mapMcpConfigsToFormSchema(mcpSettings);
      },
    });
  },
  useDeleteMcpSettings: (
    mutationOption?: Omit<MutationOptions<void, Error, string>, 'mutationFn'>,
  ) => {
    return useMutation<void, Error, string>({
      mutationFn: async (id: string) => mcpSettingsApi.deleteMcpSettings(id),
      ...mutationOption,
    });
  },
  useSaveMcpSettings: (
    mutationOption?: Omit<
      MutationOptions<McpConfig[], Error, McpSettingsFormSchema>,
      'mutationFn'
    >,
  ) => {
    return useMutation<McpConfig[], Error, McpSettingsFormSchema>({
      mutationFn: async (mcpSettings: McpSettingsFormSchema) => {
        const configs = mapFormSchemaToMcpConfigs(mcpSettings);
        const results = await Promise.all(
          configs.map((config) => mcpSettingsApi.saveMcpSettings(config)),
        );
        return results;
      },
      ...mutationOption,
    });
  },
};
