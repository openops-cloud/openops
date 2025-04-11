import { BlockAuth, Property, createBlock } from '@openops/blocks-framework';
import Client from 'ssh2-sftp-client';
import { createFile } from './lib/actions/create-file';
import { readFileContent } from './lib/actions/read-file';
import { newOrModifiedFile } from './lib/triggers/new-modified-file';
export const sftpAuth = BlockAuth.CustomAuth({
  description: 'Enter the authentication details',
  props: {
    host: Property.ShortText({
      displayName: 'Host',
      description: 'The host of the SFTP server',
      required: true,
    }),
    port: Property.Number({
      displayName: 'Port',
      description: 'The port of the SFTP server',
      required: true,
      defaultValue: 22,
    }),
    username: Property.ShortText({
      displayName: 'Username',
      description: 'The username of the SFTP server',
      required: true,
    }),
    password: BlockAuth.SecretText({
      displayName: 'Password',
      description: 'The password of the SFTP server',
      required: true,
    }),
  },
  validate: async ({ auth }) => {
    const { host, port, username, password } = auth;
    const sftp = new Client();

    try {
      await sftp.connect({
        host,
        port,
        username,
        password,
        timeout: 10000,
      });
      return {
        valid: true,
      };
    } catch (err) {
      return {
        valid: false,
        error:
          'Connection failed. Please check your credentials and try again.',
      };
    } finally {
      await sftp.end();
    }
  },
  required: true,
});

export const sftp = createBlock({
  displayName: 'SFTP',
  description: 'Secure file transfer protocol',

  minimumSupportedRelease: '0.7.1',
  logoUrl: 'https://static.openops.com/blocks/sftp.svg',
  categories: [],
  authors: [
    'Abdallah-Alwarawreh',
    'kishanprmr',
    'AbdulTheActiveBlockr',
    'khaledmashaly',
    'abuaboud',
  ],
  auth: sftpAuth,
  actions: [createFile, readFileContent],
  triggers: [newOrModifiedFile],
});
