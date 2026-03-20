import { createContext, useContext } from 'react';

export const PermissionMessageContext = createContext<string | undefined>(
  undefined,
);

export const usePermissionMessage = () => useContext(PermissionMessageContext);
