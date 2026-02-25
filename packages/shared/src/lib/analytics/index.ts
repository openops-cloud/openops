import { Static, Type } from '@sinclair/typebox';

export const AnalyticsBlockReportItem = Type.Object({
  name: Type.String(),
  displayName: Type.String(),
  logoUrl: Type.String(),
  usageCount: Type.Number(),
});
export type AnalyticsBlockReportItem = Static<typeof AnalyticsBlockReportItem>;

export const AnalyticsBlockReport = Type.Array(AnalyticsBlockReportItem);
export type AnalyticsBlockReport = Static<typeof AnalyticsBlockReport>;

export const AnalyticsProjectReportItem = Type.Object({
  id: Type.String(),
  displayName: Type.String(),
  activeFlows: Type.Number(),
  totalFlows: Type.Number(),
});
export type AnalyticsProjectReportItem = Static<
  typeof AnalyticsProjectReportItem
>;

export const AnalyticsProjectReport = Type.Array(AnalyticsProjectReportItem);
export type AnalyticsProjectReport = Static<typeof AnalyticsProjectReport>;

export const AnalyticsReportResponse = Type.Object({
  totalFlows: Type.Number(),
  activeFlows: Type.Number(),
  totalUsers: Type.Number(),
  activeUsers: Type.Number(),
  totalProjects: Type.Number(),
  activeProjects: Type.Number(),
  uniqueBlocksUsed: Type.Number(),
  activeFlowsWithAI: Type.Number(),
  topBlocks: AnalyticsBlockReport,
  tasksUsage: Type.Array(
    Type.Object({
      day: Type.String(),
      totalTasks: Type.Number(),
    }),
  ),
  topProjects: AnalyticsProjectReport,
});
export type AnalyticsReportResponse = Static<typeof AnalyticsReportResponse>;

export * from './analytics-dashboard';
export * from './dashboard-overview';
