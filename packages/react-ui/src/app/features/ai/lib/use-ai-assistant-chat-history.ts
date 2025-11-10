import { QueryKeys } from '@/app/constants/query-keys';
import { toast } from '@openops/components/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from 'i18next';
import { aiAssistantChatHistoryApi } from './ai-assistant-chat-history-api';

export function useAssistantChatHistory() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: [QueryKeys.assistantHistory],
    queryFn: async () => {
      const res = await aiAssistantChatHistoryApi.list();
      return res.chats ?? [];
    },
    select: (chats) =>
      chats.map((c) => ({
        id: c.chatId,
        displayName: c.chatName || 'New chat',
      })),
  });

  const deleteMutation = useMutation({
    mutationFn: (chatId: string) => aiAssistantChatHistoryApi.delete(chatId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [QueryKeys.assistantHistory] }),
    onError: (error) => {
      console.error('Failed to delete chat', error);
      toast({
        title: t('Error'),
        variant: 'destructive',
        description: t('Failed to delete chat. Please try again.'),
        duration: 3000,
      });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ chatId, chatName }: { chatId: string; chatName: string }) =>
      aiAssistantChatHistoryApi.rename(chatId, chatName),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [QueryKeys.assistantHistory] }),
    onError: (error) => {
      console.error('Failed to rename chat', error);
      toast({
        title: t('Error'),
        variant: 'destructive',
        description: t('Failed to rename chat. Please try again.'),
        duration: 3000,
      });
    },
  });

  return {
    chats: data ?? [],
    isLoading,
    deleteChat: deleteMutation.mutateAsync,
    renameChat: renameMutation.mutateAsync,
    refetch: () =>
      qc.invalidateQueries({ queryKey: [QueryKeys.assistantHistory] }),
  };
}
