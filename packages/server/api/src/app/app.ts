import type { FastifyCookieOptions } from '@fastify/cookie';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { fastifyRequestContext } from '@fastify/request-context';
import swagger from '@fastify/swagger';
import { BlockMetadata } from '@openops/blocks-framework';
import {
  AppSystemProp,
  getRedisConnection,
  logger,
  QueueMode,
  rejectedPromiseHandler,
  SharedSystemProp,
  system,
} from '@openops/server-shared';
import {
  AppConnectionWithoutSensitiveData,
  EnvironmentType,
  Flow,
  FlowImportTemplate,
  FlowRun,
  Folder,
  isNil,
  Project,
  spreadIfDefined,
  UserInvitation,
} from '@openops/shared';
import { createAdapter } from '@socket.io/redis-adapter';
import chalk from 'chalk';
import { FastifyInstance, FastifyRequest, HTTPMethods } from 'fastify';
import fastifySocketIO from 'fastify-socket.io';
import * as process from 'node:process';
import { Socket } from 'socket.io';
import { appConnectionModule } from './app-connection/app-connection.module';
import { appEventRoutingModule } from './app-event-routing/app-event-routing.module';
import { authenticationModule } from './authentication/authentication.module';
import { pricingModule } from './aws/pricing-module';
import { blockModule } from './blocks/base-block-module';
import { blockSyncService } from './blocks/block-sync-service';
import { communityBlocksModule } from './blocks/community-block-module';
import { copilotModule } from './copilot/copilot.module';
import { requestWriterModule } from './copilot/request-writer/request-writer.module';
import { rateLimitModule } from './core/security/rate-limit';
import { securityHandlerChain } from './core/security/security-handler-chain';
import { dashboardsModule } from './dashboards/dashboards-module';
import { fileModule } from './file/file.module';
import { flagModule } from './flags/flag.module';
import { flowTemplateModule } from './flow-template/flow-template.module';
import { flowRunModule } from './flows/flow-run/flow-run-module';
import { flowModule } from './flows/flow.module';
import { formModule } from './flows/flow/form/form.module';
import { folderModule } from './flows/folder/folder.module';
import { triggerEventModule } from './flows/trigger-events/trigger-event.module';
import { encryptUtils } from './helper/encryption';
import { jwtUtils } from './helper/jwt-utils';
import { systemJobsSchedule } from './helper/system-jobs';
import { organizationModule } from './organization/organization.module';
import { projectModule } from './project/project-module';
import { slackInteractionModule } from './slack/slack-interaction-module';
import { storeEntryModule } from './store-entry/store-entry.module';
import { userInfoModule } from './user-info/user-info.module';
import { userSettingsModule } from './user-settings/user-settings.module';
import { userModule } from './user/user.module';
import { webhookModule } from './webhooks/webhook-module';
import { websocketService } from './websockets/websockets.service';
import { flowConsumer } from './workers/consumer';
import { webhookResponseWatcher } from './workers/helper/webhook-response-watcher';
import { workerModule } from './workers/worker-module';

export const setupApp = async (
  app: FastifyInstance,
): Promise<FastifyInstance> => {
  await app.register(swagger, {
    hideUntagged: true,
    openapi: {
      servers: [
        {
          url: 'https://app.openops.com/api',
          description: 'Production Server',
        },
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: 'http',
            description: 'Use your api key generated from the admin console',
            scheme: 'bearer',
          },
        },
        schemas: {
          'flow-template': FlowImportTemplate,
          folder: Folder,
          'user-invitation': UserInvitation,
          project: Project,
          flow: Flow,
          'flow-run': FlowRun,
          'app-connection': AppConnectionWithoutSensitiveData,
          block: BlockMetadata,
        },
      },
      info: {
        title: 'OpenOps Documentation',
        version: '0.0.0',
      },
      externalDocs: {
        url: 'https://www.openops.com/docs',
        description: 'Find more info here',
      },
    },
  });

  await app.register(fastifyRequestContext, {
    defaultStoreValues: (request: FastifyRequest) => ({
      requestId: request.id,
      requestMethod: request.method,
      requestPath: request.url,
      clientIp: request.ip,
    }),
  });

  app.addHook('onSend', async (request, reply) => {
    void reply.headers({ 'X-Version': system.get(SharedSystemProp.VERSION) });
  });

  await app.register(rateLimitModule);

  await app.register(cors, {
    origin: (origin, callback) => {
      if (origin === system.get(SharedSystemProp.FRONTEND_URL)) {
        return callback(null, true);
      }

      const allowedDomainsString = system.get(AppSystemProp.ALLOWED_DOMAINS);

      if (allowedDomainsString) {
        if (allowedDomainsString === '*') {
          return callback(null, true);
        }

        const allowedDomains = allowedDomainsString.split(',');

        if (allowedDomains.includes(origin as string)) {
          return callback(null, true);
        }
      }

      return callback(null, false);
    },
    exposedHeaders: ['*'],
    methods: ['*'],
    credentials: true,
  });

  await app.register(fastifySocketIO, {
    cors: {
      origin: '*',
      credentials: true,
    },
    ...spreadIfDefined('adapter', await getAdapter()),
    transports: ['websocket'],
  });

  app.io.on('connection', (socket: Socket) => {
    rejectedPromiseHandler(websocketService.init(socket));
  });

  app.addHook('onRequest', async (request, reply) => {
    const route = app.hasRoute({
      method: request.method as HTTPMethods,
      url: request.url,
    });
    if (!route) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Route not found',
      });
    }
  });

  app.addHook('preHandler', securityHandlerChain);
  await systemJobsSchedule.init();
  await app.register(fileModule);
  await app.register(flagModule);
  await app.register(storeEntryModule);
  await app.register(folderModule);
  await app.register(flowModule);
  await app.register(flowTemplateModule);
  await app.register(blockModule);
  await app.register(flowRunModule);
  await app.register(webhookModule);
  await app.register(appConnectionModule);
  await app.register(triggerEventModule);
  await app.register(appEventRoutingModule);
  await app.register(userModule);
  await app.register(authenticationModule);
  await app.register(copilotModule);
  await app.register(requestWriterModule);
  await app.register(organizationModule);
  await app.register(formModule);
  await blockSyncService.setup();
  await app.register(workerModule);
  await app.register(pricingModule);
  await app.register(slackInteractionModule);
  await app.register(dashboardsModule);
  await app.register(userInfoModule);
  await app.register(userSettingsModule);

  app.get(
    '/redirect',
    async (
      request: FastifyRequest<{ Querystring: { code: string } }>,
      reply,
    ) => {
      const params = {
        code: request.query.code,
      };
      if (!params.code) {
        return reply.send('The code is missing in url');
      } else {
        return reply
          .type('text/html')
          .send(
            `<script>if(window.opener){window.opener.postMessage({ 'code': '${encodeURIComponent(
              params.code,
            )}' },'*')}</script> <html>Redirect succuesfully, this window should close now</html>`,
          );
      }
    },
  );

  await validateEnvPropsOnStartup();

  await app.register(projectModule);
  await app.register(communityBlocksModule);

  app.addHook('onClose', async () => {
    logger.info('Shutting down');
    await flowConsumer.close();
    await systemJobsSchedule.close();
    await webhookResponseWatcher.shutdown();
  });

  await app.register(cookie, {
    secret: {
      sign: (value) => {
        return value;
      },
      unsign: (value) => {
        return {
          valid: true,
          renew: false,
          value,
        };
      },
    },
  } as FastifyCookieOptions);

  return app;
};

const validateEnvPropsOnStartup = async (): Promise<void> => {
  const codeSandboxType = process.env.OPS_CODE_SANDBOX_TYPE;
  if (!isNil(codeSandboxType)) {
    throw new Error(
      JSON.stringify({
        message:
          'OPS_CODE_SANDBOX_TYPE is deprecated, please use OPS_EXECUTION_MODE instead',
      }),
    );
  }
  const queueMode = system.getOrThrow<QueueMode>(AppSystemProp.QUEUE_MODE);
  const encryptionKey = await encryptUtils.loadEncryptionKey(queueMode);
  const isValidHexKey =
    encryptionKey && /^[A-Fa-z0-9]{32}$/.test(encryptionKey);
  if (!isValidHexKey) {
    throw new Error(
      JSON.stringify({
        message:
          'OPS_ENCRYPTION_KEY is either undefined or not a valid 32 hex string.',
      }),
    );
  }

  const jwtSecret = await jwtUtils.getJwtSecret();
  if (isNil(jwtSecret)) {
    throw new Error(
      JSON.stringify({
        message:
          'OPS_JWT_SECRET is undefined, please define it in the environment variables',
      }),
    );
  }
};

async function getAdapter() {
  const queue = system.getOrThrow<QueueMode>(AppSystemProp.QUEUE_MODE);
  switch (queue) {
    case QueueMode.MEMORY: {
      return undefined;
    }
    case QueueMode.REDIS: {
      const sub = getRedisConnection().duplicate();
      const pub = getRedisConnection().duplicate();
      return createAdapter(pub, sub);
    }
  }
}

export async function appPostBoot(): Promise<void> {
  logger.info(`${chalk.greenBright(`

    _______                    _______
    __  __ \\_____________________  __ \\_______________
    _  / / /__  __ \\  _ \\_  __ \\  / / /__  __ \\_  ___/
    / /_/ /__  /_/ /  __/  / / / /_/ /__  /_/ /(__  )
    \\____/ _  .___/\\___//_/ /_/\\____/ _  .___//____/
           /_/                        /_/
`)}
The application started on ${system.get(
    SharedSystemProp.FRONTEND_URL,
  )}, as specified by the OPS_FRONTEND_URL variables.
`);

  const blocksSource = system.getOrThrow(SharedSystemProp.BLOCKS_SOURCE);

  logger.info(`Application version: ${system.get(SharedSystemProp.VERSION)}`);
  logger.info(`Node version: ${process.version}`);
  logger.info(`Blocks will be loaded from source type ${blocksSource}`);

  const environment = system.get(SharedSystemProp.ENVIRONMENT);
  if (environment === EnvironmentType.DEVELOPMENT) {
    logger.warn(
      `[WARNING]: The application is running in ${environment} mode.`,
    );
  }
}
