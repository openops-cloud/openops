import { UserSettingsDefinition } from '@openops/shared';
import { create } from 'zustand';
import { UserInfo } from '../features/cloud/lib/cloud-user-api';

const SIDEBAR_MINIMIZED_KEY = 'dashboard-sidebar-minimized';

type AppState = {
  isSidebarMinimized: boolean;
  setIsSidebarMinimized: (isMinimized: boolean) => void;
  expandedFlowFolderIds: Set<string>;
  setExpandedFlowFolderIds: (ids: Set<string>) => void;
  cloudUser: UserInfo | null;
  setCloudUser: (user: UserInfo | null) => void;
  userSettings: UserSettingsDefinition;
  setUserSettings: (userSettings: UserSettingsDefinition) => void;
  isAiChatOpened: boolean;
  setIsAiChatOpened: (isAiChatOpened: boolean) => void;
};

const getInitialSidebarState = (): boolean => {
  const stored = localStorage.getItem(SIDEBAR_MINIMIZED_KEY);
  return stored ? JSON.parse(stored) : false;
};

export const useAppStore = create<AppState>((set) => ({
  isSidebarMinimized: getInitialSidebarState(),
  setIsSidebarMinimized: (isMinimized) => {
    localStorage.setItem(SIDEBAR_MINIMIZED_KEY, JSON.stringify(isMinimized));
    set({ isSidebarMinimized: isMinimized });
  },
  expandedFlowFolderIds: new Set(),
  setExpandedFlowFolderIds: (ids) => set({ expandedFlowFolderIds: ids }),
  cloudUser: null,
  setCloudUser: (user) => set({ cloudUser: user }),
  userSettings: {},
  setUserSettings: (userSettings) => set({ userSettings: userSettings }),
  isAiChatOpened: false,
  setIsAiChatOpened: (isAiChatOpened: boolean) => set({ isAiChatOpened }),
}));
