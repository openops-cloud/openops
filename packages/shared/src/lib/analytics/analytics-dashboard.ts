import { Static, Type } from '@sinclair/typebox';

export const AnalyticsDashboard = Type.Object({
  id: Type.String(),
  name: Type.String(),
  embedId: Type.String(),
  slug: Type.String(),
  enabled: Type.Boolean(),
});

export type AnalyticsDashboard = Static<typeof AnalyticsDashboard>;

export const AnalyticsDashboardRegistry = Type.Object({
  dashboards: Type.Array(AnalyticsDashboard),
  defaultDashboardId: Type.String(),
});

export type AnalyticsDashboardRegistry = Static<
  typeof AnalyticsDashboardRegistry
>;
