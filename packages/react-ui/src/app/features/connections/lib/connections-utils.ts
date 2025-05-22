import { formUtils } from '@/app/features/builder/block-properties/form-utils';
import { authenticationSession } from '@/app/lib/authentication-session';
import {
  BlockMetadataModel,
  BlockMetadataModelSummary,
  CustomAuthProperty,
  PropertyType,
} from '@openops/blocks-framework';
import {
  AppConnection,
  AppConnectionType,
  assertNotNullOrUndefined,
  BasicAuthConnectionValue,
  CloudOAuth2ConnectionValue,
  CustomAuthConnectionValue,
  isNil,
  SecretTextConnectionValue,
  UpsertAppConnectionRequestBody,
  UpsertBasicAuthRequest,
  UpsertCloudOAuth2Request,
  UpsertCustomAuthRequest,
  UpsertOAuth2Request,
  UpsertPlatformOAuth2Request,
  UpsertSecretTextRequest,
} from '@openops/shared';
import { Type } from '@sinclair/typebox';
import { t } from 'i18next';

export const buildConnectionSchema = (
  block: BlockMetadataModelSummary | BlockMetadataModel,
) => {
  const auth = block.auth;
  if (isNil(auth)) {
    return Type.Object({
      request: Type.Composite([
        Type.Omit(UpsertAppConnectionRequestBody, ['name']),
      ]),
    });
  }
  const connectionSchema = Type.Object({
    name: Type.String({
      pattern: '^[A-Za-z0-9_\\-@\\+\\.]*$',
      minLength: 1,
      errorMessage: t('Name can only contain letters, numbers and underscores'),
    }),
  });

  switch (auth.type) {
    case PropertyType.SECRET_TEXT:
      return Type.Object({
        request: Type.Composite([
          Type.Omit(UpsertSecretTextRequest, ['name']),
          connectionSchema,
        ]),
      });
    case PropertyType.BASIC_AUTH:
      return Type.Object({
        request: Type.Composite([
          Type.Omit(UpsertBasicAuthRequest, ['name']),
          connectionSchema,
        ]),
      });
    case PropertyType.CUSTOM_AUTH:
      return Type.Object({
        request: Type.Composite([
          Type.Omit(UpsertCustomAuthRequest, ['name', 'value']),
          connectionSchema,
          Type.Object({
            value: Type.Object({
              props: formUtils.buildSchema(
                (auth as CustomAuthProperty<any>).props,
              ),
            }),
            type: Type.Literal(AppConnectionType.CUSTOM_AUTH),
          }),
        ]),
      });
    case PropertyType.OAUTH2:
      return Type.Object({
        request: Type.Composite([
          Type.Omit(
            Type.Union([
              UpsertOAuth2Request,
              UpsertCloudOAuth2Request,
              UpsertPlatformOAuth2Request,
            ]),
            ['name'],
          ),
          connectionSchema,
        ]),
      });
    default:
      return Type.Object({
        request: Type.Composite([
          Type.Omit(UpsertAppConnectionRequestBody, ['name']),
          connectionSchema,
        ]),
      });
  }
};

export const createDefaultValues = (
  block: BlockMetadataModelSummary | BlockMetadataModel,
  existingConnection: AppConnection | null,
  suggestedConnectionName: string,
): Partial<UpsertAppConnectionRequestBody> & { id?: string } => {
  const projectId = authenticationSession.getProjectId();
  assertNotNullOrUndefined(projectId, 'projectId');
  switch (block.auth?.type) {
    case PropertyType.SECRET_TEXT:
      return {
        id: existingConnection?.id,
        name: suggestedConnectionName,
        blockName: block.name,
        projectId,
        type: AppConnectionType.SECRET_TEXT,
        value: existingConnection
          ? (existingConnection.value as SecretTextConnectionValue)
          : {
              type: AppConnectionType.SECRET_TEXT,
              secret_text: '',
            },
      };
    case PropertyType.BASIC_AUTH:
      return {
        id: existingConnection?.id,
        name: suggestedConnectionName,
        blockName: block.name,
        projectId,
        type: AppConnectionType.BASIC_AUTH,
        value: existingConnection
          ? (existingConnection.value as BasicAuthConnectionValue)
          : {
              type: AppConnectionType.BASIC_AUTH,
              username: '',
              password: '',
            },
      };
    case PropertyType.CUSTOM_AUTH:
      return {
        id: existingConnection?.id,
        name: suggestedConnectionName,
        blockName: block.name,
        projectId,
        type: AppConnectionType.CUSTOM_AUTH,
        value: existingConnection
          ? (existingConnection.value as CustomAuthConnectionValue)
          : {
              type: AppConnectionType.CUSTOM_AUTH,
              props: formUtils.getDefaultValueForStep(block.auth.props, {}),
            },
      };
    case PropertyType.OAUTH2:
      return {
        id: existingConnection?.id,
        name: suggestedConnectionName,
        blockName: block.name,
        projectId,
        type: AppConnectionType.CLOUD_OAUTH2,
        value: existingConnection
          ? ({
              scope: block.auth?.scope.join(' '),
              client_id: '',
              props: {},
              code: '',
              ...existingConnection.value,
            } as CloudOAuth2ConnectionValue & {
              code: string;
              props:
                | {
                    [x: string]: string;
                  }
                | undefined;
            })
          : {
              type: AppConnectionType.CLOUD_OAUTH2,
              scope: block.auth?.scope.join(' '),
              client_id: '',
              props: {},
              code: '',
            },
      };
    default:
      throw new Error(`Unsupported property type: ${block.auth}`);
  }
};
