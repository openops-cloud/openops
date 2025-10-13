import { RiskLevel } from '@openops/shared';
import { Static, Type } from '@sinclair/typebox';
import { ActionBase } from '../block-metadata';
import { ActionContext } from '../context';
import { InputPropertyMap } from '../property';
import { BlockAuthProperty } from '../property/authentication';

export type ActionRunner<
  BlockAuth extends BlockAuthProperty,
  ActionProps extends InputPropertyMap,
> = (ctx: ActionContext<BlockAuth, ActionProps>) => Promise<unknown | void>;

export const ErrorHandlingOptionsParam = Type.Object({
  retryOnFailure: Type.Object({
    defaultValue: Type.Optional(Type.Boolean()),
    hide: Type.Optional(Type.Boolean()),
  }),
  continueOnFailure: Type.Object({
    defaultValue: Type.Optional(Type.Boolean()),
    hide: Type.Optional(Type.Boolean()),
  }),
});
export type ErrorHandlingOptionsParam = Static<
  typeof ErrorHandlingOptionsParam
>;

type CreateActionParams<
  BlockAuth extends BlockAuthProperty,
  ActionProps extends InputPropertyMap,
> = {
  /**
   * A dummy parameter used to infer {@code BlockAuth} type
   */
  name: string;
  auth?: BlockAuth;
  displayName: string;
  description: string;
  riskLevel?: RiskLevel;
  props: ActionProps;
  run: ActionRunner<BlockAuth, ActionProps>;
  test?: ActionRunner<BlockAuth, ActionProps>;
  requireAuth?: boolean;
  errorHandlingOptions?: ErrorHandlingOptionsParam;
  isWriteAction: boolean;
};

export class IAction<
  BlockAuth extends BlockAuthProperty,
  ActionProps extends InputPropertyMap,
> implements ActionBase
{
  constructor(
    public readonly name: string,
    public readonly displayName: string,
    public readonly description: string,
    public readonly riskLevel: RiskLevel = RiskLevel.NONE,
    public readonly props: ActionProps,
    public readonly run: ActionRunner<BlockAuth, ActionProps>,
    public readonly test: ActionRunner<BlockAuth, ActionProps>,
    public readonly requireAuth: boolean,
    public readonly errorHandlingOptions: ErrorHandlingOptionsParam,
    public readonly isWriteAction: boolean,
  ) {}
}

export type Action<
  BlockAuth extends BlockAuthProperty = any,
  ActionProps extends InputPropertyMap = any,
> = IAction<BlockAuth, ActionProps>;

export const createAction = <
  BlockAuth extends BlockAuthProperty = BlockAuthProperty,
  ActionProps extends InputPropertyMap = any,
>(
  params: CreateActionParams<BlockAuth, ActionProps>,
) => {
  return new IAction(
    params.name,
    params.displayName,
    params.description,
    params.riskLevel,
    params.props,
    params.run,
    params.test ?? params.run,
    params.requireAuth ?? true,
    params.errorHandlingOptions ?? {
      continueOnFailure: {
        defaultValue: false,
      },
      retryOnFailure: {
        defaultValue: false,
      },
    },
    params.isWriteAction,
  );
};
