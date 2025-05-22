import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@openops/components/ui';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { flagsHooks } from '@/app/common/hooks/flags-hooks';
import { oauth2Utils } from '@/app/lib/oauth2-utils';
import {
  BlockMetadataModel,
  BlockMetadataModelSummary,
  OAuth2Property,
  OAuth2Props,
} from '@openops/blocks-framework';
import {
  AppConnection,
  AppConnectionType,
  FlagId,
  OAuth2GrantType,
  OpsEdition,
  UpsertCloudOAuth2Request,
  UpsertOAuth2Request,
  UpsertPlatformOAuth2Request,
  isNil,
} from '@openops/shared';

import { AutoPropertiesFormComponent } from '../../builder/block-properties/auto-properties-form';
import { formUtils } from '../../builder/block-properties/form-utils';
import { oauth2AppsHooks } from '../lib/oauth2-apps-hooks';

type OAuth2ConnectionSettingsProps = {
  block: BlockMetadataModelSummary | BlockMetadataModel;
  authProperty: OAuth2Property<OAuth2Props>;
  reconnectConnection: AppConnection | null;
};
function replaceVariables(
  authUrl: string,
  scope: string,
  props: Record<string, unknown>,
) {
  let newAuthUrl = authUrl;
  Object.entries(props).forEach(([key, value]) => {
    newAuthUrl = newAuthUrl.replace(`{${key}}`, value as string);
  });

  let newScope = scope;
  Object.entries(props).forEach(([key, value]) => {
    newScope = newScope.replace(`{${key}}`, value as string);
  });
  return {
    authUrl: newAuthUrl,
    scope: newScope,
  };
}

const OAuth2ConnectionSettings = ({
  authProperty,
  block,
  reconnectConnection,
}: OAuth2ConnectionSettingsProps) => {
  const [readyToConnect, setReadyToConnect] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [currentOAuth2Type, setOAuth2Type] = useState<
    | AppConnectionType.CLOUD_OAUTH2
    | AppConnectionType.OAUTH2
    | AppConnectionType.PLATFORM_OAUTH2
    | undefined
  >(
    reconnectConnection?.type === AppConnectionType.CLOUD_OAUTH2 ||
      reconnectConnection?.type === AppConnectionType.OAUTH2 ||
      reconnectConnection?.type === AppConnectionType.PLATFORM_OAUTH2
      ? reconnectConnection?.type
      : undefined,
  );
  const { data: thirdPartyUrl } = flagsHooks.useFlag<string>(
    FlagId.THIRD_PARTY_AUTH_PROVIDER_REDIRECT_URL,
  );
  const { data: oauthProxyUrl } = flagsHooks.useFlag<string>(
    FlagId.OAUTH_PROXY_URL,
  );

  const { data: blockToClientIdMap } =
    oauth2AppsHooks.useBlockToClientIdMap(oauthProxyUrl);
  const { data: ownAuthEnabled } = flagsHooks.useFlag<OpsEdition>(
    FlagId.OWN_AUTH2_ENABLED,
  );

  const redirectUrl =
    currentOAuth2Type === AppConnectionType.CLOUD_OAUTH2
      ? `${oauthProxyUrl}/redirect`
      : thirdPartyUrl;

  const form = useFormContext<{
    request:
      | UpsertCloudOAuth2Request
      | UpsertOAuth2Request
      | UpsertPlatformOAuth2Request;
  }>();

  const hasCode = form.getValues().request.value.code;
  const predefinedClientId = blockToClientIdMap?.[block.name]?.clientId;
  useEffect(() => {
    if (isNil(currentOAuth2Type) && !isNil(blockToClientIdMap)) {
      setOAuth2Type(
        blockToClientIdMap?.[block.name]?.type ?? AppConnectionType.OAUTH2,
      );
      return;
    }
    if (redirectUrl) {
      form.setValue('request.value.redirect_url', redirectUrl, {
        shouldValidate: true,
      });
    }
    form.setValue(
      'request.value.props',
      formUtils.getDefaultValueForStep(authProperty.props ?? {}, {}),
      { shouldValidate: true },
    );
    form.setValue(
      'request.value.client_secret',
      currentOAuth2Type === AppConnectionType.OAUTH2 ? '' : 'FAKE_SECRET',
      { shouldValidate: true },
    );

    form.setValue(
      'request.value.client_id',
      currentOAuth2Type === AppConnectionType.OAUTH2
        ? ''
        : predefinedClientId ?? '',
      { shouldValidate: true },
    );
    form.setValue('request.value.grant_type', authProperty.grantType, {
      shouldValidate: true,
    });
    form.setValue(
      'request.value.code',
      `${
        authProperty.grantType === OAuth2GrantType.CLIENT_CREDENTIALS
          ? 'FAKE_CODE'
          : ''
      }`,
      { shouldValidate: true },
    );
    form.setValue('request.value.code_challenge', '', { shouldValidate: true });
    form.setValue('request.value.type', currentOAuth2Type!, {
      shouldValidate: true,
    });
    form.setValue('request.type', currentOAuth2Type!, { shouldValidate: true });
  }, [currentOAuth2Type, blockToClientIdMap]);

  const watchedForm = form.watch();

  useEffect(() => {
    const baseCriteria =
      !isNil(redirectUrl) && !isNil(form.getValues().request.value.client_id);
    const clientSecret = (form.getValues().request as UpsertOAuth2Request)
      ?.value?.client_secret;
    const hasClientSecret = !isNil(clientSecret);
    setReadyToConnect(
      baseCriteria &&
        (currentOAuth2Type !== AppConnectionType.OAUTH2 || hasClientSecret),
    );
  }, [watchedForm]);

  async function openPopup(
    redirectUrl: string,
    clientId: string,
    props: Record<string, unknown> | undefined,
  ) {
    const { authUrl, scope } = replaceVariables(
      authProperty.authUrl,
      authProperty.scope.join(' '),
      props ?? {},
    );
    const { code, codeChallenge } = await oauth2Utils.openOAuth2Popup({
      authUrl,
      clientId,
      redirectUrl,
      scope,
      pkce: authProperty.pkce ?? false,
      extraParams: authProperty.extra ?? {},
    });
    form.setValue('request.value.code', code, { shouldValidate: true });
    form.setValue('request.value.code_challenge', codeChallenge, {
      shouldValidate: true,
    });
    setRefresh(refresh + 1);
  }

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => e.preventDefault()}
      >
        {currentOAuth2Type === AppConnectionType.OAUTH2 &&
          authProperty.grantType !== OAuth2GrantType.CLIENT_CREDENTIALS && (
            <div className="flex flex-col gap-2">
              <FormLabel>{t('Redirect URL')}</FormLabel>
              <FormControl>
                <Input disabled type="text" value={redirectUrl ?? ''} />
              </FormControl>
              <FormMessage />
            </div>
          )}

        {currentOAuth2Type === AppConnectionType.OAUTH2 && (
          <>
            <FormField
              name="request.value.client_id"
              control={form.control}
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('Client ID')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder={t('Client ID')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            ></FormField>
            <FormField
              name="request.value.client_secret"
              control={form.control}
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('Client Secret')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder={t('Client Secret')}
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            ></FormField>
          </>
        )}
        {authProperty.props && (
          <AutoPropertiesFormComponent
            prefixValue="request.value.props"
            props={authProperty.props}
            useMentionTextInput={false}
            allowDynamicValues={false}
          />
        )}

        {authProperty.grantType !== OAuth2GrantType.CLIENT_CREDENTIALS && (
          <div className="border border-solid p-2 rounded-lg gap-2 flex text-center items-center justify-center h-full">
            <div className="rounded-full border border-solid p-1 flex items-center justify-center">
              <img src={block.logoUrl} className="w-5 h-5"></img>
            </div>
            <div className="text-sm">{block.displayName}</div>
            <div className="flex-grow"></div>
            {!hasCode && (
              <Button
                size={'sm'}
                variant={'basic'}
                disabled={!readyToConnect}
                type="button"
                onClick={async () =>
                  openPopup(
                    redirectUrl!,
                    form.getValues().request.value.client_id,
                    form.getValues().request.value.props,
                  )
                }
              >
                {t('Connect')}
              </Button>
            )}
            {hasCode && (
              <Button
                size={'sm'}
                variant={'basic'}
                className="text-destructive"
                onClick={() => {
                  form.setValue('request.value.code', '', {
                    shouldValidate: true,
                  });
                  form.setValue('request.value.code_challenge', '', {
                    shouldValidate: true,
                  });
                }}
              >
                {t('Disconnect')}
              </Button>
            )}
          </div>
        )}

        {ownAuthEnabled &&
          isNil(reconnectConnection) &&
          currentOAuth2Type !== AppConnectionType.OAUTH2 && (
            <div>
              <Button
                size="sm"
                variant={'link'}
                className="text-sm h-fit"
                onClick={() => setOAuth2Type(AppConnectionType.OAUTH2)}
              >
                {t('I would like to use my own App Credentials')}
              </Button>
            </div>
          )}
        {currentOAuth2Type === AppConnectionType.OAUTH2 &&
          isNil(reconnectConnection) &&
          predefinedClientId && (
            <div>
              <Button
                size="sm"
                variant={'link'}
                className="text-sm h-fit"
                onClick={() => setOAuth2Type(AppConnectionType.CLOUD_OAUTH2)}
              >
                {t('I would like to use predefined App Credentials')}
              </Button>
            </div>
          )}
      </form>
    </Form>
  );
};

OAuth2ConnectionSettings.displayName = 'OAuth2ConnectionSettings';
export { OAuth2ConnectionSettings };
