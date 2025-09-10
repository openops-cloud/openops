import { default as React } from 'react';
import { useEffectOnce } from 'react-use';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../lib/api';

const socket = io(API_BASE_URL, {
  transports: ['websocket'],
  path: '/api/socket.io',
  autoConnect: false,
  withCredentials: true,
});

const SocketContext = React.createContext<typeof socket>(socket);

export const useSocket = () => React.useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  useEffectOnce(() => {
    socket.on('connect_error', (err) => {
      console.error('Connection failed:', err.message);
    });

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.disconnect();
    };
  });

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
