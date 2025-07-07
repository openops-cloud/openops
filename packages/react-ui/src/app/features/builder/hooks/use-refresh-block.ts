import { useEffect } from 'react';

import { useSocket } from '@/app/common/providers/socket-provider';
import { WebsocketClientEvent } from '@openops/shared';

interface UseRefreshBlockParams {
  refetchBlock: () => void;
}

export const useRefreshBlock = ({ refetchBlock }: UseRefreshBlockParams) => {
  const socket = useSocket();

  useEffect(() => {
    socket.on(WebsocketClientEvent.REFRESH_BLOCK, () => {
      refetchBlock();
    });

    return () => {
      socket.removeAllListeners(WebsocketClientEvent.REFRESH_BLOCK);
    };
  }, [socket, refetchBlock]);
};
