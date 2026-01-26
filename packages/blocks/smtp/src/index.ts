import { BlockAuth, Property, createBlock } from '@openops/blocks-framework';
import { SharedSystemProp, system } from '@openops/server-shared';
import { BlockCategory } from '@openops/shared';
import { sendEmail } from './lib/actions/send-email';
import { smtpCommon } from './lib/common';
import { connectionErrorHandler } from './lib/connection-error-handler';

const SMTPPorts = system
  .getOrThrow(SharedSystemProp.SMTP_ALLOWED_PORTS)
  .split(',')
  .map((p) => Number(p.trim()))
  .filter(Number.isFinite);

export const smtpAuth = BlockAuth.CustomAuth({
  authProviderKey: 'SMTP',
  authProviderDisplayName: 'SMTP',
  authProviderLogoUrl: '/blocks/smtp.svg',
  required: true,
  props: {
    host: Property.ShortText({
      displayName: 'Host',
      required: true,
    }),
    email: Property.ShortText({
      displayName: 'Email',
      required: true,
    }),
    password: Property.SecretText({
      displayName: 'Password',
      required: true,
    }),
    port: Property.StaticDropdown({
      displayName: 'Port',
      required: true,
      options: {
        disabled: false,
        options: SMTPPorts.map((port) => {
          return {
            label: port.toString(),
            value: port,
          };
        }),
      },
    }),
    TLS: Property.Checkbox({
      displayName: 'Require TLS?',
      defaultValue: false,
      required: true,
    }),
  },
  validate: async ({ auth }) => {
    try {
      const transporter = smtpCommon.createSMTPTransport(auth);
      return new Promise((resolve, reject) => {
        transporter.verify(function (error, success) {
          if (error) {
            const errorResult = connectionErrorHandler(error);
            resolve(errorResult);
          } else {
            resolve({ valid: true });
          }
        });
      });
    } catch (e) {
      return connectionErrorHandler(e);
    }
  },
});

export const smtp = createBlock({
  displayName: 'SMTP',
  description: 'Send emails using Simple Mail Transfer Protocol',
  minimumSupportedRelease: '0.5.0',
  logoUrl: '/blocks/smtp.svg',
  categories: [BlockCategory.COLLABORATION],
  authors: [
    'tahboubali',
    'abaza738',
    'kishanprmr',
    'MoShizzle',
    'khaledmashaly',
    'abuaboud',
    'pfernandez98',
  ],
  auth: smtpAuth,
  actions: [sendEmail],
  triggers: [],
});
