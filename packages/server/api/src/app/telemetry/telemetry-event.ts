import { WorkflowBase, WorkflowEventName } from './event-models';
import { AiBase, AiEventName } from './event-models/ai';
import {
  ConnectionBase,
  ConnectionEventName,
} from './event-models/connections';
import { UserBase, UserEventName } from './event-models/users';

type EventName =
  | WorkflowEventName
  | ConnectionEventName
  | UserEventName
  | AiEventName;

type EventLabels<T> = Record<string, string> & { userId: string } & (
    | (T extends WorkflowEventName ? WorkflowBase : never)
    | (T extends ConnectionEventName ? ConnectionBase : never)
    | (T extends UserEventName ? UserBase : never)
    | (T extends AiEventName ? AiBase : never)
  );

type BaseTelemetryEvent<T extends EventName, P extends EventLabels<T>> = {
  name: T;
  labels: P;
  value?: number;
};

export type TelemetryEvent = BaseTelemetryEvent<
  EventName,
  EventLabels<EventName>
>;
