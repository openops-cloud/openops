import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiAssistantChatHistoryApi } from './ai-assistant-chat-history-api';

export function useAssistantChatHistory() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['assistant-history'],
    queryFn: async () => {
      const res = await aiAssistantChatHistoryApi.list();
      return res.chats ?? [];
    },
    select: (chats) =>
      chats.map((c) => ({
        id: c.chatId,
        displayName: c.chatName || 'New chat',
      })),
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (chatId: string) => aiAssistantChatHistoryApi.delete(chatId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assistant-history'] }),
  });

  const renameMutation = useMutation({
    mutationFn: ({ chatId, chatName }: { chatId: string; chatName: string }) =>
      aiAssistantChatHistoryApi.rename(chatId, chatName),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assistant-history'] }),
  });

  return {
    chats: data ?? [],
    isLoading,
    deleteChat: deleteMutation.mutateAsync,
    renameChat: renameMutation.mutateAsync,
    refetch: () => qc.invalidateQueries({ queryKey: ['assistant-history'] }),
  };
}
