export enum ChatTypes {
  CHAT = 'chat',
  CHANNEL = 'channel',
}

export type ChatOption = { id: string; type: ChatTypes.CHAT };

export type ChannelOption = {
  teamId: string;
  id: string;
  type: ChatTypes.CHANNEL;
};
