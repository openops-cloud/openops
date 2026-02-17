import {
  AI_CHAT_CONTAINER_SIZES,
  AiAssistantChatSizeState,
  BoxSize,
} from '@openops/components/ui';
import { UserSettingsDefinition } from '@openops/shared';
import { create } from 'zustand';
import {
  AI_CHAT_OPENED_KEY,
  SIDEBAR_MINIMIZED_KEY,
} from '../constants/sidebar';
import { UserInfo } from '../features/cloud/lib/cloud-user-api';

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
  aiChatSize: AiAssistantChatSizeState;
  setAiChatSize: (size: AiAssistantChatSizeState) => void;
  aiChatDimensions: BoxSize | null;
  setAiChatDimensions: (dimensions: BoxSize) => void;
  aiChatInput: string;
  setAiChatInput: (input: string) => void;
  clearAiChatInput: () => void;
  isBenchmarkWizardOpen: boolean;
  setIsBenchmarkWizardOpen: (isOpen: boolean) => void;
};

const getInitialSidebarState = (key: string, defaultValue = false): boolean => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
};

export const useAppStore = create<AppState>((set) => ({
  isSidebarMinimized: getInitialSidebarState(SIDEBAR_MINIMIZED_KEY),
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
  isAiChatOpened: getInitialSidebarState(AI_CHAT_OPENED_KEY),
  setIsAiChatOpened: (isAiChatOpened: boolean) => {
    localStorage.setItem(AI_CHAT_OPENED_KEY, JSON.stringify(isAiChatOpened));
    set({ isAiChatOpened });
  },
  aiChatSize: AI_CHAT_CONTAINER_SIZES.DOCKED,
  setAiChatSize: (size: AiAssistantChatSizeState) =>
    set({ aiChatSize: size, aiChatDimensions: null }),
  aiChatDimensions: null,
  setAiChatDimensions: (dimensions: BoxSize) =>
    set({ aiChatDimensions: dimensions }),
  aiChatInput: '',
  setAiChatInput: (input) => {
    set({ aiChatInput: input });
  },
  clearAiChatInput: () => {
    set({ aiChatInput: '' });
  },
  isBenchmarkWizardOpen: false,
  setIsBenchmarkWizardOpen: (isOpen: boolean) => {
    set({ isBenchmarkWizardOpen: isOpen });
  },
}));
