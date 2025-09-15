import { ToolSet } from 'ai';
import { Server as SocketIOServer } from 'socket.io';

export function wrapToolsWithApproval(
  tools: ToolSet,
  _: () => void,
  _io?: SocketIOServer,
): ToolSet {
  return tools;
}
