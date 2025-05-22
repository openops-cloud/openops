type User = {
  id: number;
  name: string;
  email: string;
  workspace: number;
  permissions: string;
  created_on: string;
  user_id: number;
  to_be_deleted: boolean;
};

export type TableWorkspace = {
  id: number;
  name: string;
  users: User[];
  order: number;
  permissions: string;
  unread_notifications_count: number;
  generative_ai_models_enabled: string;
};
