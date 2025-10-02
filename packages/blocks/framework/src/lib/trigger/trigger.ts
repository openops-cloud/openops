import { TriggerTestStrategy } from '@openops/shared';
import { Static, Type } from '@sinclair/typebox';
import { TriggerBase } from '../block-metadata';
import { TestOrRunHookContext, TriggerHookContext } from '../context';
import { InputPropertyMap } from '../property';
import { BlockAuthProperty } from '../property/authentication';

export const DEDUPE_KEY_PROPERTY = '_dedupe_key';

export enum TriggerStrategy {
  POLLING = 'POLLING',
  WEBHOOK = 'WEBHOOK',
  APP_WEBHOOK = 'APP_WEBHOOK',
  SCHEDULED = 'SCHEDULED',
}

export enum WebhookHandshakeStrategy {
  NONE = 'NONE',
  HEADER_PRESENT = 'HEADER_PRESENT',
  QUERY_PRESENT = 'QUERY_PRESENT',
  BODY_PARAM_PRESENT = 'BODY_PARAM_PRESENT',
}

export enum WebhookRenewStrategy {
  CRON = 'CRON',
  NONE = 'NONE',
}

export const WebhookHandshakeConfiguration = Type.Object({
  strategy: Type.Enum(WebhookHandshakeStrategy),
  paramName: Type.Optional(Type.String()),
});

export type WebhookHandshakeConfiguration = Static<
  typeof WebhookHandshakeConfiguration
>;

export const WebhookRenewConfiguration = Type.Union([
  Type.Object({
    strategy: Type.Literal(WebhookRenewStrategy.CRON),
    cronExpression: Type.String(),
  }),
  Type.Object({
    strategy: Type.Literal(WebhookRenewStrategy.NONE),
  }),
]);
export type WebhookRenewConfiguration = Static<
  typeof WebhookRenewConfiguration
>;

export interface WebhookResponse {
  status: number;
  body?: any;
  headers?: Record<string, string>;
}

type BaseTriggerParams<
  BlockAuth extends BlockAuthProperty,
  TriggerProps extends InputPropertyMap,
  TS extends TriggerStrategy,
> = {
  name: string;
  displayName: string;
  description: string;
  requireAuth?: boolean;
  auth?: BlockAuth;
  props: TriggerProps;
  type: TS;
  onEnable: (
    context: TriggerHookContext<BlockAuth, TriggerProps, TS>,
  ) => Promise<void>;
  onDisable: (
    context: TriggerHookContext<BlockAuth, TriggerProps, TS>,
  ) => Promise<void>;
  run: (
    context: TestOrRunHookContext<BlockAuth, TriggerProps, TS>,
  ) => Promise<unknown[]>;
  test?: (
    context: TestOrRunHookContext<BlockAuth, TriggerProps, TS>,
  ) => Promise<unknown[]>;
  sampleData: unknown;
};

type WebhookTriggerParams<
  BlockAuth extends BlockAuthProperty,
  TriggerProps extends InputPropertyMap,
  TS extends TriggerStrategy,
> = BaseTriggerParams<BlockAuth, TriggerProps, TS> & {
  handshakeConfiguration?: WebhookHandshakeConfiguration;
  onHandshake?: (
    context: TriggerHookContext<BlockAuth, TriggerProps, TS>,
  ) => Promise<WebhookResponse>;
  renewConfiguration?: WebhookRenewConfiguration;
  onRenew?(
    context: TriggerHookContext<BlockAuth, TriggerProps, TS>,
  ): Promise<void>;
};

type CreateTriggerParams<
  BlockAuth extends BlockAuthProperty,
  TriggerProps extends InputPropertyMap,
  TS extends TriggerStrategy,
> = TS extends TriggerStrategy.WEBHOOK
  ? WebhookTriggerParams<BlockAuth, TriggerProps, TS>
  : BaseTriggerParams<BlockAuth, TriggerProps, TS>;

export class ITrigger<
  TS extends TriggerStrategy,
  BlockAuth extends BlockAuthProperty,
  TriggerProps extends InputPropertyMap,
> implements TriggerBase
{
  constructor(
    public readonly name: string,
    public readonly displayName: string,
    public readonly description: string,
    public readonly requireAuth: boolean,
    public readonly props: TriggerProps,
    public readonly type: TS,
    public readonly handshakeConfiguration: WebhookHandshakeConfiguration,
    public readonly onHandshake: (
      ctx: TriggerHookContext<BlockAuth, TriggerProps, TS>,
    ) => Promise<WebhookResponse>,
    public readonly renewConfiguration: WebhookRenewConfiguration,
    public readonly onRenew: (
      ctx: TriggerHookContext<BlockAuth, TriggerProps, TS>,
    ) => Promise<void>,
    public readonly onEnable: (
      ctx: TriggerHookContext<BlockAuth, TriggerProps, TS>,
    ) => Promise<void>,
    public readonly onDisable: (
      ctx: TriggerHookContext<BlockAuth, TriggerProps, TS>,
    ) => Promise<void>,
    public readonly run: (
      ctx: TestOrRunHookContext<BlockAuth, TriggerProps, TS>,
    ) => Promise<unknown[]>,
    public readonly test: (
      ctx: TestOrRunHookContext<BlockAuth, TriggerProps, TS>,
    ) => Promise<unknown[]>,
    public readonly sampleData: unknown,
    public readonly testStrategy: TriggerTestStrategy,
  ) {}
}

export type Trigger<
  BlockAuth extends BlockAuthProperty = any,
  TriggerProps extends InputPropertyMap = any,
  S extends TriggerStrategy = TriggerStrategy,
> = ITrigger<S, BlockAuth, TriggerProps>;

// TODO refactor and extract common logic
export const createTrigger = <
  TS extends TriggerStrategy,
  BlockAuth extends BlockAuthProperty,
  TriggerProps extends InputPropertyMap,
>(
  params: CreateTriggerParams<BlockAuth, TriggerProps, TS>,
) => {
  switch (params.type) {
    case TriggerStrategy.WEBHOOK:
      return new ITrigger(
        params.name,
        params.displayName,
        params.description,
        params.requireAuth ?? true,
        params.props,
        params.type,
        params.handshakeConfiguration ?? {
          strategy: WebhookHandshakeStrategy.NONE,
        },
        params.onHandshake ?? (async () => ({ status: 200 })),
        params.renewConfiguration ?? { strategy: WebhookRenewStrategy.NONE },
        params.onRenew ?? (async () => Promise.resolve()),
        params.onEnable,
        params.onDisable,
        params.run,
        params.test ?? (() => Promise.resolve([params.sampleData])),
        params.sampleData,
        params.test
          ? TriggerTestStrategy.TEST_FUNCTION
          : TriggerTestStrategy.SIMULATION,
      );
    case TriggerStrategy.POLLING:
      return new ITrigger(
        params.name,
        params.displayName,
        params.description,
        params.requireAuth ?? true,
        params.props,
        params.type,
        { strategy: WebhookHandshakeStrategy.NONE },
        async () => ({ status: 200 }),
        { strategy: WebhookRenewStrategy.NONE },
        async () => Promise.resolve(),
        params.onEnable,
        params.onDisable,
        params.run,
        params.test ?? (() => Promise.resolve([params.sampleData])),
        params.sampleData,
        TriggerTestStrategy.TEST_FUNCTION,
      );
    case TriggerStrategy.SCHEDULED:
      return new ITrigger(
        params.name,
        params.displayName,
        params.description,
        params.requireAuth ?? true,
        params.props,
        params.type,
        { strategy: WebhookHandshakeStrategy.NONE },
        async () => ({ status: 200 }),
        { strategy: WebhookRenewStrategy.NONE },
        async () => Promise.resolve(),
        params.onEnable,
        params.onDisable,
        params.run,
        params.test ?? (() => Promise.resolve([params.sampleData])),
        params.sampleData,
        TriggerTestStrategy.TEST_FUNCTION,
      );
    case TriggerStrategy.APP_WEBHOOK:
      return new ITrigger(
        params.name,
        params.displayName,
        params.description,
        params.requireAuth ?? true,
        params.props,
        params.type,
        { strategy: WebhookHandshakeStrategy.NONE },
        async () => ({ status: 200 }),
        { strategy: WebhookRenewStrategy.NONE },
        async () => Promise.resolve(),
        params.onEnable,
        params.onDisable,
        params.run,
        params.test ?? (() => Promise.resolve([params.sampleData])),
        params.sampleData,
        TriggerTestStrategy.TEST_FUNCTION,
      );
  }
};
