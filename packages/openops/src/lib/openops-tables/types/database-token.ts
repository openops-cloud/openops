export type DatabaseToken = {
  id: number;
  name: string;
  workspace: number;
  key: string;
  permissions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
};
