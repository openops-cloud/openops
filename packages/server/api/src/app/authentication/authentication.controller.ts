import { RateLimitOptions } from '@fastify/rate-limit';
import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  AppSystemProp,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import {
  ALL_PRINCIPAL_TYPES,
  AuthenticationResponse,
  OpsEdition,
  PrincipalType,
  SignInRequest,
  SignUpRequest,
} from '@openops/shared';
import { FastifyReply } from 'fastify';
import { jwtDecode } from 'jwt-decode';
import { getSubDomain } from '../helper/sub-domain';
import { analyticsDashboardService } from '../openops-analytics/analytics-dashboard-service';
import { resolveOrganizationIdForAuthnRequest } from '../organization/organization-utils';
import { userService } from '../user/user-service';
import { analyticsAuthenticationService } from './analytics-authentication-service';
import { authenticationService } from './authentication-service';
import { Provider } from './authentication-service/hooks/authentication-service-hooks';

const edition = system.getEdition();
const adminEmail = system.getOrThrow(AppSystemProp.OPENOPS_ADMIN_EMAIL);

export const GetBlockRequestParams = Type.Object({
  dashboardEmbedUuid: Type.String(),
});

const AnalyticsGuestTokenRequestOptions = {
  config: {
    allowedPrincipals: ALL_PRINCIPAL_TYPES,
  },
  schema: {
    description:
      'Retrieve a guest token for accessing analytics dashboards. This endpoint requires a valid dashboard embed UUID to generate a temporary access token for embedded dashboard views.',
    querystring: GetBlockRequestParams,
  },
};

export const authenticationController: FastifyPluginAsyncTypebox = async (
  app,
) => {
  app.post('/sign-up', SignUpRequestOptions, async (request, reply) => {
    const user = await userService.getMetaInfo({
      id: request.principal.id,
    });

    if (!user || user.email !== adminEmail) {
      return reply.code(403).send({
        statusCode: 403,
        error: 'Insufficient Permissions',
        message: 'Adding new users only allowed to admin user.',
      });
    }

    const signUpResponse = await authenticationService.signUp({
      ...request.body,
      verified: edition === OpsEdition.COMMUNITY,
      organizationId: null,
      provider: Provider.EMAIL,
    });

    return sendResponse(reply, signUpResponse);
  });

  app.post('/sign-in', SignInRequestOptions, async (request, reply) => {
    const organizationId = await resolveOrganizationIdForAuthnRequest(
      request.body.email,
      request,
    );

    const signInResponse = await authenticationService.signIn({
      email: request.body.email,
      password: request.body.password,
      organizationId,
      provider: Provider.EMAIL,
    });

    return sendResponse(reply, signInResponse);
  });
  app.post(
    '/sign-out',
    {
      config: {
        allowedPrincipals: ALL_PRINCIPAL_TYPES,
        skipAuth: true,
      },
    },
    async (request, reply) => {
      return reply
        .clearCookie('jwt_token', {
          domain: getOpenOpsSubDomain(),
          path: '/',
        })
        .clearCookie('token', {
          path: '/',
        })
        .send('Cookies removed');
    },
  );
  app.get('/analytics-embed-id', async (request, reply) => {
    const { access_token } = await analyticsAuthenticationService.signIn();

    const embedId = await analyticsDashboardService.fetchFinopsDashboardEmbedId(
      access_token,
    );

    return reply.send(embedId);
  });
  app.get(
    '/analytics-guest-token',
    AnalyticsGuestTokenRequestOptions,
    async (request, reply) => {
      const { access_token } = await analyticsAuthenticationService.signIn();

      const guestToken =
        await analyticsDashboardService.fetchDashboardGuestToken(
          access_token,
          request.query.dashboardEmbedUuid,
        );

      return reply.send(guestToken);
    },
  );
};

const rateLimitOptions: RateLimitOptions = {
  max: Number.parseInt(
    system.getOrThrow(AppSystemProp.API_RATE_LIMIT_AUTHN_MAX),
    10,
  ),
  timeWindow: system.getOrThrow(AppSystemProp.API_RATE_LIMIT_AUTHN_WINDOW),
};

const SignUpRequestOptions = {
  config: {
    allowedPrincipals: [PrincipalType.USER],
    rateLimit: rateLimitOptions,
  },
  schema: {
    description:
      'Register a new user in the system. This endpoint is restricted to admin users only and requires email and password credentials. In community edition, users are automatically verified upon registration.',
    body: SignUpRequest,
  },
};

const SignInRequestOptions = {
  config: {
    allowedPrincipals: ALL_PRINCIPAL_TYPES,
    rateLimit: rateLimitOptions,
  },
  schema: {
    description:
      'Authenticate a user and generate access tokens. This endpoint validates email and password credentials, resolves the organization context, and returns JWT tokens for subsequent API access. Rate limited to prevent brute force attacks.',
    body: SignInRequest,
  },
};

function sendResponse(
  reply: FastifyReply,
  response: AuthenticationResponse,
): FastifyReply {
  const date = jwtDecode<{ exp: number }>(response.tablesRefreshToken);
  const cookieExpiryDate = new Date(date.exp * 1000);

  return reply
    .setCookie('jwt_token', response.tablesRefreshToken, {
      domain: getOpenOpsSubDomain(),
      path: '/',
      signed: true,
      httpOnly: false,
      expires: cookieExpiryDate,
    })
    .setCookie('token', response.token, {
      path: '/',
      signed: true,
      httpOnly: false,
      expires: cookieExpiryDate,
      sameSite: 'lax',
    })
    .send(response);
}

function getOpenOpsSubDomain(): string {
  const frontendUrl = system.getOrThrow(SharedSystemProp.FRONTEND_URL);

  const tablesUrl = system.getOrThrow(AppSystemProp.OPENOPS_TABLES_PUBLIC_URL);

  return getSubDomain(frontendUrl, tablesUrl);
}
