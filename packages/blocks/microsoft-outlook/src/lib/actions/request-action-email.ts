import { BodyType, Message } from '@microsoft/microsoft-graph-types';
import {
  createAction,
  Property,
  StoreScope,
  Validators,
} from '@openops/blocks-framework';
import { getMicrosoftGraphClient } from '@openops/common';
import { networkUtls } from '@openops/server-shared';
import { ExecutionType } from '@openops/shared';
import { microsoftOutlookAuth } from '../common/auth';
import { onActionReceived } from '../common/on-action-received';
import { waitForInteraction } from '../common/wait-for-interaction';

export type OutlookActionButton = {
  buttonText: string;
  buttonStyle: 'positive' | 'destructive' | 'default';
  resumeUrl?: string;
};

export const requestActionEmailAction = createAction({
  auth: microsoftOutlookAuth,
  name: 'microsoft_outlook_request_action_email',
  displayName: 'Request Action',
  description:
    'Send an email to one or more recipients and wait until an action is selected',
  isWriteAction: true,
  props: {
    recipients: Property.Array({
      displayName: 'To Email(s)',
      required: true,
    }),
    header: Property.ShortText({
      displayName: 'Header',
      required: true,
    }),
    message: Property.LongText({
      displayName: 'Message',
      required: false,
    }),
    actions: Property.Array({
      displayName: 'Action Buttons',
      required: true,
      validators: [Validators.maxArrayLength(6)],
      defaultValue: [
        { buttonText: 'Approve', buttonStyle: 'positive' },
        { buttonText: 'Dismiss', buttonStyle: 'destructive' },
        { buttonText: 'Snooze', buttonStyle: 'default' },
      ],
      properties: {
        buttonText: Property.ShortText({
          displayName: 'Button text',
          required: true,
        }),
        buttonStyle: Property.StaticDropdown({
          displayName: 'Button color',
          required: true,
          defaultValue: 'default',
          options: {
            options: [
              { label: 'Blue', value: 'positive' },
              { label: 'Red', value: 'destructive' },
              { label: 'Transparent', value: 'default' },
            ],
          },
        }),
      },
    }),
    timeoutInDays: Property.Number({
      displayName: 'Wait Timeout in Days',
      description: 'Number of days to wait for an action.',
      defaultValue: 3,
      required: true,
      validators: [Validators.minValue(1)],
    }),
  },
  async run(context) {
    const { recipients, header, message, actions } = context.propsValue as {
      recipients: string[];
      header: string;
      message: string;
      actions: OutlookActionButton[];
    };

    if (context.executionType === ExecutionType.BEGIN) {
      const baseUrl = await networkUtls.getPublicUrl();

      const preparedActions: OutlookActionButton[] = actions.map((action) => {
        const resumeUrl = context.generateResumeUrl(
          {
            queryParams: {
              executionCorrelationId: context.run.pauseId,
              button: action.buttonText,
            },
          },
          baseUrl,
        );
        return {
          ...action,
          resumeUrl: `https://static.openops.com/html/resume_execution.html?isTest=${
            context.run.isTest
          }&redirectUrl=${encodeURIComponent(resumeUrl)}`,
        };
      });

      const htmlBody = buildHtmlEmailBody(header, message, preparedActions);

      const mailPayload: Message = {
        subject: header,
        body: {
          contentType: 'html' as BodyType,
          content: htmlBody,
        },
        toRecipients: recipients.map((mail) => ({
          emailAddress: { address: mail },
        })),
      };

      const client = getMicrosoftGraphClient(context.auth.access_token);
      await client.api('/me/sendMail').post({
        message: mailPayload,
        saveToSentItems: 'true',
      });

      const messageResult = {
        subject: header,
        recipients,
      };

      await context.store.put(
        `outlookMessage_${context.currentExecutionPath}`,
        messageResult,
        StoreScope.FLOW_RUN,
      );

      return await waitForInteraction(
        messageResult,
        context.propsValue.timeoutInDays,
        context,
        context.currentExecutionPath,
      );
    }

    const messageObj: any = await context.store.get(
      `outlookMessage_${context.currentExecutionPath}`,
      StoreScope.FLOW_RUN,
    );

    if (!messageObj) {
      throw new Error(
        'Could not fetch outlook message from store, context.currentExecutionPath: ' +
          context.currentExecutionPath,
      );
    }

    const actionLabels = (actions as OutlookActionButton[]).map(
      (a) => a.buttonText,
    );

    return await onActionReceived({
      messageObj,
      actionLabels,
      context,
    });
  },
});

function buildHtmlEmailBody(
  header: string,
  message: string,
  actions: OutlookActionButton[],
): string {
  const styles = `
    <style>
      .btn { display:inline-block; margin:4px 8px 4px 0; padding:10px 16px; text-decoration:none; border-radius:4px; font-family:Arial, sans-serif; font-size:14px; }
      .btn-default { background:#f3f4f6; color:#111827; border:1px solid #e5e7eb; }
      .btn-positive { background:#2563eb; color:#ffffff; }
      .btn-destructive { background:#dc2626; color:#ffffff; }
    </style>
  `;

  const buttons = actions
    .map((a) => {
      const cls =
        a.buttonStyle === 'positive'
          ? 'btn-positive'
          : a.buttonStyle === 'destructive'
          ? 'btn-destructive'
          : 'btn-default';
      return `<a class="btn ${cls}" href="${
        a.resumeUrl
      }" target="_blank">${escapeHtml(a.buttonText)}</a>`;
    })
    .join('');

  const safeHeader = escapeHtml(header);
  const safeMessage = message ? message : '';

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      ${styles}
    </head>
    <body>
      <div style="font-family:Arial, sans-serif; color:#111827;">
        <h2 style="margin:0 0 12px 0; font-weight:600;">${safeHeader}</h2>
        ${safeMessage ? `<p style="margin:0 0 16px 0;">${safeMessage}</p>` : ''}
        <div>${buttons}</div>
      </div>
    </body>
  </html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
