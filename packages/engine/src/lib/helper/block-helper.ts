import {
  ArrayProperty,
  BlockMetadata,
  BlockPropertyMap,
  DropdownProperty,
  DropdownState,
  DynamicProperties,
  MultiSelectDropdownProperty,
  OAuth2PropertyValue,
  PropertyContext,
  PropertyType,
  StaticPropsValue,
} from '@openops/blocks-framework';
import { validateHost } from '@openops/server-shared';
import {
  BasicAuthConnectionValue,
  CustomAuthConnectionValue,
  ExecuteExtractBlockMetadata,
  ExecutePropsOptions,
  ExecuteValidateAuthOperation,
  ExecuteValidateAuthResponse,
  SecretTextConnectionValue,
} from '@openops/shared';
import { EngineConstants } from '../handler/context/engine-constants';
import { FlowExecutorContext } from '../handler/context/flow-execution-context';
import { createPropsResolver } from '../variables/props-resolver';
import { blockLoader } from './block-loader';

async function evaluateProp(
  ctx: PropertyContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  property: any,
  resolvedInput: StaticPropsValue<BlockPropertyMap>,
): Promise<unknown> {
  if (property.type === PropertyType.ARRAY) {
    const arrayProperty = property as ArrayProperty<boolean>;
    const properties = arrayProperty.properties || {};
    const subProp = properties[ctx.input.propertyName as string];

    if (!subProp) {
      return {
        disabled: true,
        options: [],
        placeholder: 'Property not found',
      } as DropdownState<unknown>;
    }

    return evaluateProp(ctx, subProp, resolvedInput);
  }

  if (property.type === PropertyType.DYNAMIC) {
    const dynamicProperty = property as DynamicProperties<boolean>;
    const subProps = await dynamicProperty.props(resolvedInput, ctx);

    if (!ctx.input.propertyName) {
      return subProps;
    }

    // ugly hack, assuming that Dynamic properties will always have only one sub-dynamic property, such as an array with dynamic properties
    const [firstKey] = Object.keys(subProps);
    if (firstKey) {
      const firstSubProp = subProps[firstKey];
      return evaluateProp(ctx, firstSubProp, resolvedInput);
    }
  }

  if (property.type === PropertyType.MULTI_SELECT_DROPDOWN) {
    const multiSelectProperty = property as MultiSelectDropdownProperty<
      unknown,
      boolean
    >;
    return multiSelectProperty.options(resolvedInput, ctx);
  }

  if (property.type === PropertyType.DROPDOWN) {
    const dropdownProperty = property as DropdownProperty<unknown, boolean>;
    return dropdownProperty.options(resolvedInput, ctx);
  }

  return {
    [ctx.input.propertyName as string]: property,
  };
}

export const blockHelper = {
  async executeProps({
    params,
    blocksSource,
    executionState,
    constants,
    searchValue,
  }: {
    searchValue?: string;
    executionState: FlowExecutorContext;
    params: ExecutePropsOptions;
    blocksSource: string;
    constants: EngineConstants;
  }) {
    const property = await blockLoader.getPropOrThrow({
      params,
      blocksSource,
    });

    try {
      const { resolvedInput } = await createPropsResolver({
        apiUrl: constants.internalApiUrl,
        projectId: params.projectId,
        engineToken: params.engineToken,
      }).resolve<StaticPropsValue<BlockPropertyMap>>({
        unresolvedInput: params.input,
        executionState,
      });
      const ctx = {
        searchValue,
        flows: {
          current: {
            id: params.flowVersion.flowId,
            version: {
              id: params.flowVersion.id,
            },
          },
        },
        server: {
          token: params.engineToken,
          apiUrl: constants.internalApiUrl,
          publicUrl: params.publicUrl,
        },
        project: {
          id: params.projectId,
        },
        input: params.input,
      };

      return await evaluateProp(ctx, property, resolvedInput);
    } catch (e) {
      console.error(e);
      return {
        disabled: true,
        options: [],
        placeholder: 'Throws an error, reconnect or refresh the page',
      } as DropdownState<unknown>;
    }
  },

  async executeValidateAuth(
    params: ExecuteValidateAuthOperation,
  ): Promise<ExecuteValidateAuthResponse> {
    const block = await blockLoader.loadBlockOrThrow({
      blockName: params.blockName,
      blockVersion: params.blockVersion,
      blocksSource: EngineConstants.BLOCK_SOURCES,
    });
    const authProperty = block.auth;

    if (authProperty?.validate === undefined) {
      return {
        valid: true,
      };
    }

    switch (authProperty.type) {
      case PropertyType.BASIC_AUTH: {
        const con = params.auth as BasicAuthConnectionValue;
        return authProperty.validate({
          auth: {
            username: con.username,
            password: con.password,
          },
        });
      }
      case PropertyType.SECRET_TEXT: {
        const con = params.auth as SecretTextConnectionValue;
        return authProperty.validate({
          auth: con.secret_text,
        });
      }
      case PropertyType.OAUTH2: {
        const auth = params.auth as OAuth2PropertyValue;
        return authProperty.validate({
          auth,
        });
      }
      case PropertyType.CUSTOM_AUTH: {
        const con = params.auth as CustomAuthConnectionValue;
        const propsToValidate = ['host', 'apiUrl', 'authUrl'];
        for (const prop of propsToValidate) {
          if (con.props[prop]) {
            await validateHost(con.props[prop] as string);
          }
        }
        return authProperty.validate({
          auth: con.props,
        });
      }
      default: {
        throw new Error('Invalid auth type');
      }
    }
  },

  async extractBlockMetadata({
    blocksSource,
    params,
  }: {
    blocksSource: string;
    params: ExecuteExtractBlockMetadata;
  }): Promise<BlockMetadata> {
    const { blockName, blockVersion } = params;
    const block = await blockLoader.loadBlockOrThrow({
      blockName,
      blockVersion,
      blocksSource,
    });

    return {
      ...block.metadata(),
      name: blockName,
      version: blockVersion,
      authors: block.authors,
    };
  },
};
