export type TeamsUser = {
  displayName: string;
  email: string;
  id: string;
};

export type TeamsChannel = {
  displayName: string;
  teamName: string;
  id: string;
};

export type TeamsMessageAction = {
  buttonText: string;
  buttonStyle: string;
};

export type TeamsMessageButton = TeamsMessageAction & {
  type: 'Action.Submit' | 'Action.OpenUrl';
  resumeUrl?: string;
};

export interface InteractionPayload {
  button: string;
  path: string;
}
