import { Filter } from '@aws-sdk/client-pricing';
import {
  FastifyPluginAsyncTypebox,
  FastifyPluginCallbackTypebox,
} from '@fastify/type-provider-typebox';
import { SupportedPricingRegion } from '@openops/common';
import { FastifyRequest } from 'fastify';
import { StatusCodes } from 'http-status-codes';
import { GetPricingRequest } from './pricing-request';
import { getPrice } from './pricing-service';

export const pricingModule: FastifyPluginAsyncTypebox = async (app) => {
  await app.register(PricingController, { prefix: '/v1/pricing' });
};

const PricingController: FastifyPluginCallbackTypebox = (
  fastify,
  _opts,
  done,
) => {
  fastify.get(
    '/',
    { schema: { querystring: GetPricingRequest } },
    async (
      request: FastifyRequest<{ Querystring: GetPricingRequest }>,
      reply,
    ) => {
      try {
        const result = await getPrice(
          request.query.serviceCode,
          JSON.parse(request.query.filters) as Filter[],
          request.query.region as unknown as SupportedPricingRegion,
        );

        return result;
      } catch (error) {
        return reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
          success: false,
          message: (error as Error).message,
        });
      }
    },
  );
  done();
};
