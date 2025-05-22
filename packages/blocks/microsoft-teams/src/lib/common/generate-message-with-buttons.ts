export type TeamsMessageAction = {
  buttonText: string;
  buttonStyle: string;
};

export type TeamsMessageButton = TeamsMessageAction & { resumeUrl?: string };

export interface InteractionPayload {
  button: string;
  path: string;
}

export type TeamsMessageWithActionsPayload = {
  body: {
    contentType: string;
    content: string;
  };
  attachments: {
    id: string;
    contentType: string;
    contentUrl: string | null;
    content: string;
  }[];
};

export function generateMessageWithButtons({
  header,
  message,
  actions = [],
  enableActions = true,
  additionalText,
}: {
  header: string;
  message?: string;
  actions: TeamsMessageButton[];
  enableActions?: boolean;
  additionalText?: string;
}): TeamsMessageWithActionsPayload {
  const rawAdaptiveCard = {
    type: 'AdaptiveCard',
    $schema: 'https://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.4',
    body: [
      {
        type: 'TextBlock',
        text: header,
        size: 'Medium',
        weight: 'Bolder',
        wrap: true,
      },
      {
        type: 'TextBlock',
        text: message ?? '',
        wrap: true,
        separator: true,
      },
    ],
    actions: [] as {
      type: string;
      title: string;
      url?: string;
      style: string;
    }[],
  };

  if (additionalText) {
    rawAdaptiveCard.body.push({
      type: 'TextBlock',
      text: additionalText,
      wrap: true,
      separator: true,
    });
  }

  rawAdaptiveCard.actions = actions.map((action) => ({
    type: 'Action.OpenUrl',
    method: 'GET',
    title: action.buttonText,
    url: action.resumeUrl,
    style: action.buttonStyle,
    isEnabled: enableActions,
  }));

  const cardAttachment = {
    id: 'adaptiveCardAttachment',
    contentType: 'application/vnd.microsoft.card.adaptive',
    contentUrl: null,
    content: JSON.stringify(rawAdaptiveCard),
  };

  return {
    body: {
      contentType: 'html',
      content: `<attachment id="${cardAttachment.id}"></attachment>`,
    },
    attachments: [cardAttachment],
  };
}
