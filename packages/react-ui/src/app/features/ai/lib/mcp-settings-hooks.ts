import { QueryKeys } from '@/app/constants/query-keys';
import { McpConfig } from '@openops/shared';
import { MutationOptions, useMutation, useQuery } from '@tanstack/react-query';
import { McpSettingsFormSchema } from './mcp-form-utils';
import { mcpSettingsApi } from './mcp-settings-api';

export const mcpSettingsHooks = {
  useMcpSettings: () => {
    return useQuery<McpConfig, Error>({
      queryKey: [QueryKeys.mcpSettings],
      queryFn: () => mcpSettingsApi.getMcpSettings(),
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
      MutationOptions<McpConfig, Error, McpSettingsFormSchema>,
      'mutationFn'
    >,
  ) => {
    return useMutation<McpConfig, Error, McpSettingsFormSchema>({
      mutationFn: (mcpSettings: McpSettingsFormSchema) => {
        return mcpSettingsApi.saveMcpSettings(mcpSettings);
      },
      ...mutationOption,
    });
  },
};
