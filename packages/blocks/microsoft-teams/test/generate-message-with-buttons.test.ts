import {
  generateMessageWithButtons,
  TeamsMessageButton,
  TeamsMessageWithActionsPayload,
} from '../src/lib/common/generate-message-with-buttons';

describe('generateMessageWithButtons', () => {
  test('should generate a message with no actions and only header', () => {
    const payload = generateMessageWithButtons({
      header: 'Test Header',
      actions: [],
    });

    expect(payload).toEqual<TeamsMessageWithActionsPayload>({
      body: {
        contentType: 'html',
        content: '<attachment id="adaptiveCardAttachment"></attachment>',
      },
      attachments: [
        {
          id: 'adaptiveCardAttachment',
          contentType: 'application/vnd.microsoft.card.adaptive',
          contentUrl: null,
          content: JSON.stringify({
            type: 'AdaptiveCard',
            $schema: 'https://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.4',
            body: [
              {
                type: 'TextBlock',
                text: 'Test Header',
                size: 'Medium',
                weight: 'Bolder',
                wrap: true,
              },
              {
                type: 'TextBlock',
                text: '',
                wrap: true,
                separator: true,
              },
            ],
            actions: [],
          }),
        },
      ],
    });
  });

  test('should include actions in the adaptive card', () => {
    const actions: TeamsMessageButton[] = [
      {
        buttonText: 'Approve',
        buttonStyle: 'positive',
        resumeUrl: 'https://approve.com',
      },
      {
        buttonText: 'Cancel',
        buttonStyle: 'destructive',
        resumeUrl: 'https://cancel.com',
      },
    ];

    const payload = generateMessageWithButtons({
      header: 'Test Header',
      message: 'This is a test message.',
      actions,
    });

    expect(payload.attachments[0].content).toContain('"title":"Approve"');
    expect(payload.attachments[0].content).toContain('"title":"Cancel"');
    expect(payload.attachments[0].content).toContain(
      '"url":"https://approve.com"',
    );
    expect(payload.attachments[0].content).toContain(
      '"url":"https://cancel.com"',
    );
  });

  test('should disable actions if enableActions is false', () => {
    const actions: TeamsMessageButton[] = [
      {
        buttonText: 'Approve',
        buttonStyle: 'positive',
        resumeUrl: 'https://approve.com',
      },
    ];

    const payload = generateMessageWithButtons({
      header: 'Test Header',
      actions,
      enableActions: false,
    });

    const adaptiveCard = JSON.parse(payload.attachments[0].content);
    expect(adaptiveCard.actions[0].isEnabled).toBe(false);
  });

  test('should include additionalText in the body if provided', () => {
    const payload = generateMessageWithButtons({
      header: 'Test Header',
      additionalText: 'This is additional text.',
      actions: [],
    });

    const adaptiveCard = JSON.parse(payload.attachments[0].content);
    expect(adaptiveCard.body).toContainEqual({
      type: 'TextBlock',
      text: 'This is additional text.',
      wrap: true,
      separator: true,
    });
  });

  test('should handle both message and additionalText', () => {
    const payload = generateMessageWithButtons({
      header: 'Header with message and text',
      message: 'Test message.',
      additionalText: 'Additional details are here.',
      actions: [],
    });

    const adaptiveCard = JSON.parse(payload.attachments[0].content);
    expect(adaptiveCard.body[1].text).toBe('Test message.');
    expect(adaptiveCard.body[2].text).toBe('Additional details are here.');
  });

  test('should use default values for empty or undefined inputs', () => {
    const payload = generateMessageWithButtons({
      header: 'Default Test',
      actions: [],
    });

    const adaptiveCard = JSON.parse(payload.attachments[0].content);
    expect(adaptiveCard.body[1].text).toBe(''); // Message defaults to an empty string
    expect(adaptiveCard.actions).toEqual([]); // No actions added
  });
});
