import {
  BlockBase,
  BlockMetadata,
  BlockMetadataModel,
  BlockMetadataModelSummary,
} from '@openops/blocks-framework';
import {
  BlockCategory,
  BlockOrderBy,
  BlockSortBy,
  BlockType,
  ListVersionsResponse,
  OpsEdition,
  PackageType,
  ProjectId,
  SuggestionType,
} from '@openops/shared';
import { EntityManager } from 'typeorm';

type ListParams = {
  release: string;
  projectId?: string;
  organizationId?: string;
  includeHidden: boolean;
  edition: OpsEdition;
  categories?: BlockCategory[];
  tags?: string[];
  sortBy?: BlockSortBy;
  orderBy?: BlockOrderBy;
  searchQuery?: string;
  suggestionType?: SuggestionType;
};

type GetOrThrowParams = {
  name: string;
  version: string | undefined;
  projectId: string | undefined;
  entityManager?: EntityManager;
};

type ListVersionsParams = {
  name: string;
  projectId: string | undefined;
  release: string | undefined;
  edition: OpsEdition;
  organizationId: string | undefined;
};

type DeleteParams = {
  id: string;
  projectId?: string;
};

type CreateParams = {
  blockMetadata: BlockMetadata;
  organizationId?: string;
  projectId?: string;
  packageType: PackageType;
  blockType: BlockType;
  archiveId?: string;
};

type UpdateUsage = {
  id: string;
  usage: number;
};

type GetExactBlockVersionParams = {
  name: string;
  version: string;
  projectId: ProjectId;
};

export type BlockMetadataService = {
  listAll(): Promise<BlockBase[]>;
  list(params: ListParams): Promise<BlockMetadataModelSummary[]>;
  get(params: GetOrThrowParams): Promise<BlockMetadataModel | undefined>;
  getOrThrow(params: GetOrThrowParams): Promise<BlockMetadataModel>;
  getVersions(params: ListVersionsParams): Promise<ListVersionsResponse>;
  create(params: CreateParams): Promise<BlockMetadataModel>;
  delete(params: DeleteParams): Promise<void>;
  updateUsage(params: UpdateUsage): Promise<void>;
  getExactBlockVersion(params: GetExactBlockVersionParams): Promise<string>;
};
