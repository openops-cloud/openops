import {
  AppConnectionValue,
  ExecutionType,
  FlowRunId,
  PauseMetadata,
  ProjectId,
  ResumePayload,
  StopResponse,
  TriggerPayload,
} from '@openops/shared';
import {
  BlockPropValueSchema,
  InputPropertyMap,
  StaticPropsValue,
} from './property';
import { BlockAuthProperty } from './property/authentication';
import { TriggerStrategy } from './trigger/trigger';

type BaseContext<
  BlockAuth extends BlockAuthProperty,
  Props extends InputPropertyMap,
> = {
  flows: FlowContext;
  auth: BlockPropValueSchema<BlockAuth>;
  propsValue: StaticPropsValue<Props>;
  store: Store;
  project: {
    id: ProjectId;
  };
};

type AppWebhookTriggerHookContext<
  BlockAuth extends BlockAuthProperty,
  TriggerProps extends InputPropertyMap,
> = BaseContext<BlockAuth, TriggerProps> & {
  webhookUrl: string;
  payload: TriggerPayload;
  app: {
    createListeners({
      events,
      identifierValue,
    }: {
      events: string[];
      identifierValue: string;
    }): void;
  };
};

type PollingTriggerHookContext<
  BlockAuth extends BlockAuthProperty,
  TriggerProps extends InputPropertyMap,
> = BaseContext<BlockAuth, TriggerProps> & {
  setSchedule(schedule: { cronExpression: string; timezone?: string }): void;
};

type WebhookTriggerHookContext<
  BlockAuth extends BlockAuthProperty,
  TriggerProps extends InputPropertyMap,
> = BaseContext<BlockAuth, TriggerProps> & {
  webhookUrl: string;
  payload: TriggerPayload;
};

export type TriggerHookContext<
  BlockAuth extends BlockAuthProperty,
  TriggerProps extends InputPropertyMap,
  S extends TriggerStrategy,
> = S extends TriggerStrategy.APP_WEBHOOK
  ? AppWebhookTriggerHookContext<BlockAuth, TriggerProps>
  : S extends TriggerStrategy.POLLING
  ? PollingTriggerHookContext<BlockAuth, TriggerProps>
  : S extends TriggerStrategy.WEBHOOK
  ? WebhookTriggerHookContext<BlockAuth, TriggerProps>
  : never;

export type TestOrRunHookContext<
  BlockAuth extends BlockAuthProperty,
  TriggerProps extends InputPropertyMap,
  S extends TriggerStrategy,
> = TriggerHookContext<BlockAuth, TriggerProps, S> & {
  files: FilesService;
};

export type StopHookParams = {
  response: StopResponse;
};

export type StopHook = (params: StopHookParams) => void;

export type PauseHookParams = {
  pauseMetadata: PauseMetadata;
};

export type PauseHook = (params: { pauseMetadata: PauseMetadata }) => void;

export type FlowContext = {
  current: {
    id: string;
    version: {
      id: string;
    };
  };
};

export type PropertyContext = {
  server: ServerContext;
  flows: FlowContext;
  project: {
    id: ProjectId;
  };
  searchValue?: string;
  input: Record<string, unknown>;
};

export type ServerContext = {
  apiUrl: string;
  publicUrl: string;
  token: string;
};
export type BaseActionContext<
  ET extends ExecutionType,
  BlockAuth extends BlockAuthProperty,
  ActionProps extends InputPropertyMap,
> = BaseContext<BlockAuth, ActionProps> & {
  executionType: ET;
  connections: ConnectionsManager;
  tags: TagsManager;
  server: ServerContext;
  files: FilesService;
  serverUrl: string;
  run: {
    id: FlowRunId;
    name: string;
    pauseId: string;
    stop: StopHook;
    pause: PauseHook;
    isTest: boolean;
  };
  generateResumeUrl: (
    params: {
      queryParams: Record<string, string>;
    },
    baseUrl?: string,
  ) => string;
  currentExecutionPath: string;
};

type BeginExecutionActionContext<
  BlockAuth extends BlockAuthProperty = BlockAuthProperty,
  ActionProps extends InputPropertyMap = InputPropertyMap,
> = BaseActionContext<ExecutionType.BEGIN, BlockAuth, ActionProps>;

export type ResumeExecutionActionContext<
  BlockAuth extends BlockAuthProperty = BlockAuthProperty,
  ActionProps extends InputPropertyMap = InputPropertyMap,
> = BaseActionContext<ExecutionType.RESUME, BlockAuth, ActionProps> & {
  resumePayload: ResumePayload;
};

export type ActionContext<
  BlockAuth extends BlockAuthProperty = BlockAuthProperty,
  ActionProps extends InputPropertyMap = InputPropertyMap,
> =
  | BeginExecutionActionContext<BlockAuth, ActionProps>
  | ResumeExecutionActionContext<BlockAuth, ActionProps>;

export interface FilesService {
  write({
    fileName,
    data,
  }: {
    fileName: string;
    data: Buffer;
  }): Promise<string>;
}

export interface ConnectionsManager {
  get(
    key: string,
  ): Promise<AppConnectionValue | Record<string, unknown> | string | null>;
}

export interface TagsManager {
  add(params: { name: string }): Promise<void>;
}

export interface Store {
  put<T>(key: string, value: T, scope?: StoreScope): Promise<T>;
  get<T>(key: string, scope?: StoreScope): Promise<T | null>;
  delete(key: string, scope?: StoreScope): Promise<void>;
}

export enum StoreScope {
  // Collection were deprecated in favor of project
  PROJECT = 'COLLECTION',
  FLOW = 'FLOW',
  FLOW_RUN = 'FLOW_RUN',
}
