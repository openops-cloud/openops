import { OAuth2PropertyValue, blockAuth, createblock } from '@openops/blocks-framework';

import { createCustomApiCallAction } from '@openops/blocks-common';
import { blockCategory } from '@openops/shared';
import { createDocument } from './lib/actions/create-document';
import { createDocumentBasedOnTemplate } from './lib/actions/create-document-based-on-template.action';
import { readDocument } from './lib/actions/read-document.action';
import { appendText } from './lib/actions/append-text';
import { findDocumentAction } from './lib/actions/find-document';
import { newDocumentTrigger } from './lib/triggers/new-document';

export const googleDocsAuth = blockAuth.OAuth2({
	authUrl: 'https://accounts.google.com/o/oauth2/auth',
	tokenUrl: 'https://oauth2.googleapis.com/token',
	required: true,
	scope: [
		'https://www.googleapis.com/auth/documents',
		'https://www.googleapis.com/auth/drive.readonly',
		'https://www.googleapis.com/auth/drive',
	],
});

export const googleDocs = createblock({
	displayName: 'Google Docs',
	description: 'Create and edit documents online',

	minimumSupportedRelease: '0.30.0',
	logoUrl: 'https://cdn.openops.com/blocks/google-docs.png',
	categories: [blockCategory.CONTENT_AND_FILES],
	authors: [
		'pfernandez98',
		'kishanprmr',
		'MoShizzle',
		'khaledmashaly',
		'abuaboud',
		'AbdullahBitar',
		'Kevinyu-alan'
	],
	auth: googleDocsAuth,
	actions: [
		createDocument,
		createDocumentBasedOnTemplate,
		readDocument,
		findDocumentAction,
		createCustomApiCallAction({
			baseUrl: () => 'https://docs.googleapis.com/v1',
			auth: googleDocsAuth,
			authMapping: async (auth) => ({
				Authorization: `Bearer ${(auth as OAuth2PropertyValue).access_token}`,
			}),
		}),
		appendText,
	],
	triggers: [newDocumentTrigger],
});
