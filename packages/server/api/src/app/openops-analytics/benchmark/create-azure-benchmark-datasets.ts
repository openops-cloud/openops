import { createVirtualDataset } from '../virtual-dataset';

export async function createAzureBenchmarkDatasets(
  token: string,
  databaseId: number,
  opportunitiesTableName: string,
  timeseriesTableName: string,
) {
  const opportunities = await createVirtualDataset(token, {
    tableName: 'Azure_Benchmark_Opportunities',
    sql: `
        SELECT *
        FROM public."${opportunitiesTableName}"
        WHERE "Workflow" LIKE 'Azure Benchmark%'
    `,
    databaseId,
    schema: 'public',
    recreateIfExists: true,
  });

  const kpi = await createVirtualDataset(token, {
    tableName: 'Azure_Benchmark_KPI_efficiency',
    sql: `
      WITH opp AS (
        SELECT
          "Account" AS opp_account,
          COALESCE(SUM("Estimated savings USD per month"), 0) AS opp_sum
        FROM public."${opportunitiesTableName}"
        WHERE "Workflow" LIKE 'Azure Benchmark%'
        GROUP BY "Account"
      ),
      ts AS (
        SELECT
          "Account" AS ts_account,
          COALESCE(SUM("Value"), 0) AS ts_value
        FROM public."${timeseriesTableName}"
        WHERE "Workflow" = 'Run Azure Benchmark'
          AND "Date" = (date_trunc('month', current_date) - interval '1 month')::date
        GROUP BY "Account"
      )
      SELECT
        COALESCE(opp.opp_account, ts.ts_account) AS "Account",
        COALESCE(opp.opp_sum, 0) AS savings,
        COALESCE(ts.ts_value, 0) AS monthly_cost,
        CASE
          WHEN COALESCE(ts.ts_value, 0) = 0 THEN 100.0
          ELSE (1 - (COALESCE(opp.opp_sum, 0) / COALESCE(ts.ts_value, 0))) * 100.0
        END AS kpi
      FROM opp
      FULL OUTER JOIN ts
        ON opp.opp_account = ts.ts_account;
    `,
    databaseId,
    schema: 'public',
    recreateIfExists: true,
  });

  const timeseries = await createVirtualDataset(token, {
    tableName: 'Azure_Benchmark_Timeseries',
    sql: `
        SELECT *
        FROM public."${timeseriesTableName}"
        WHERE "Workflow" = 'Run Azure Benchmark' AND "Account" IS NOT NULL
    `,
    databaseId,
    schema: 'public',
    recreateIfExists: true,
  });

  return { opportunities, kpi, timeseries };
}
