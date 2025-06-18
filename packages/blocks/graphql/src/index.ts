
import { createblock, blockAuth } from "@openops/blocks-framework";
import { query } from "./lib/actions/query";
import { blockCategory } from "@openops/shared";

    export const graphql = createblock({
      displayName: "GraphQL",
      auth: blockAuth.None(),
      minimumSupportedRelease: '0.30.0',
      logoUrl: "https://cdn.openops.com/blocks/graphql.svg",
      categories:[blockCategory.CORE],
      authors: ['mahmuthamet'],
      actions: [query],
      triggers: [],
    });
