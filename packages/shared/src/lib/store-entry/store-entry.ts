import { BaseModel } from '../common';
import { OpenOpsId } from '../common/id-generator';
import { ProjectId } from '../project';

export type StoreEntryId = OpenOpsId;

export const STORE_KEY_MAX_LENGTH = 128;

export type StoreEntry = {
  key: string;
  projectId: ProjectId;
  value: unknown;
} & BaseModel<StoreEntryId>;
