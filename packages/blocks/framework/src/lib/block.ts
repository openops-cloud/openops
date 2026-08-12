import {
  BlockCategory,
  EventPayload,
  ParseEventResponse,
} from '@openops/shared';
import { Action } from './action/action';
import { BlockBaseDetails, BlockMetadata } from './block-metadata';
import { BlockAuthProperty } from './property/authentication';
import { Trigger } from './trigger/trigger';

export class Block<
  BlockAuth extends BlockAuthProperty = BlockAuthProperty,
> implements Omit<BlockBaseDetails, 'version' | 'name'> {
  private readonly _actions: Record<string, Action> = {};
  private readonly _triggers: Record<string, Trigger> = {};

  constructor(
    public readonly displayName: string,
    public readonly logoUrl: string,
    public readonly authors: string[],
    public readonly events: BlockEventProcessors | undefined,
    actions: Action<BlockAuth>[],
    triggers: Trigger<BlockAuth>[],
    public readonly categories: BlockCategory[],
    public readonly auth?: BlockAuth,
    public readonly minimumSupportedRelease?: string,
    public readonly maximumSupportedRelease?: string,
    public readonly description = '',
  ) {
    actions.forEach((action) => (this._actions[action.name] = action));
    triggers.forEach((trigger) => (this._triggers[trigger.name] = trigger));
  }

  metadata(): BackwardCompatibleBlockMetadata {
    return {
      displayName: this.displayName,
      logoUrl: this.logoUrl,
      actions: this._actions,
      triggers: this._triggers,
      categories: this.categories,
      description: this.description,
      authors: this.authors,
      auth: this.auth,
      minimumSupportedRelease: this.minimumSupportedRelease,
      maximumSupportedRelease: this.maximumSupportedRelease,
    };
  }

  getAction(actionName: string): Action | undefined {
    return this._actions[actionName];
  }

  getTrigger(triggerName: string): Trigger | undefined {
    return this._triggers[triggerName];
  }

  actions() {
    return this._actions;
  }

  triggers() {
    return this._triggers;
  }
}

export const createBlock = <BlockAuth extends BlockAuthProperty>(
  params: CreateBlockParams<BlockAuth>,
) => {
  return new Block(
    params.displayName,
    params.logoUrl,
    params.authors ?? [],
    params.events,
    params.actions,
    params.triggers,
    params.categories ?? [],
    params.auth ?? undefined,
    params.minimumSupportedRelease,
    params.maximumSupportedRelease,
    params.description,
  );
};

type CreateBlockParams<
  BlockAuth extends BlockAuthProperty = BlockAuthProperty,
> = {
  displayName: string;
  logoUrl: string;
  authors: string[];
  description?: string;
  auth: BlockAuth | undefined;
  events?: BlockEventProcessors;
  minimumSupportedRelease?: string;
  maximumSupportedRelease?: string;
  actions: Action<BlockAuth>[];
  triggers: Trigger<BlockAuth>[];
  categories?: BlockCategory[];
};

type BlockEventProcessors = {
  parseAndReply: (ctx: { payload: EventPayload }) => ParseEventResponse;
  verify: (ctx: {
    webhookSecret: string;
    payload: EventPayload;
    appWebhookUrl: string;
  }) => boolean;
};

type BackwardCompatibleBlockMetadata = Omit<
  BlockMetadata,
  'name' | 'version' | 'authors'
> & {
  authors?: BlockMetadata['authors'];
};
