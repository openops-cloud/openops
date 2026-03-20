import * as React from 'react';
import { useMemo } from 'react';
import {
  Bar,
  Customized,
  BarChart as RechartsBarChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  PlotAreaBackground,
} from './chart';
import { useHiddenKeys } from './use-hidden-keys';

export type BarChartBarDefinition = {
  dataKey: string;
  radius?: number | [number, number, number, number];
  stackId?: string;
};

export type BarChartProps = {
  data: Record<string, unknown>[];
  config: ChartConfig;
  bars: BarChartBarDefinition[];
  yAxisTickFormatter?: (value: any) => string;
  xAxisTickFormatter?: (value: any) => string;
  xAxisKey?: string;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  barSize?: number;
  barCategoryGap?: number | string;
  legendClassName?: string;
  className?: string;
};

export function BarChart({
  data,
  config,
  bars,
  yAxisTickFormatter,
  xAxisTickFormatter,
  xAxisKey = 'name',
  showXAxis = true,
  showYAxis = false,
  showTooltip = true,
  showLegend = false,
  barSize,
  barCategoryGap,
  legendClassName,
  className,
}: BarChartProps): React.JSX.Element {
  const { hiddenKeys, toggleKey } = useHiddenKeys();

  const yAxisDomain = useMemo<[number, number]>(() => {
    let max = 0;
    for (const row of data) {
      const stackTotals: Record<string, number> = {};
      for (const bar of bars) {
        const v = Number(row[bar.dataKey] ?? 0);
        const groupKey = bar.stackId ?? bar.dataKey;
        stackTotals[groupKey] = (stackTotals[groupKey] ?? 0) + v;
      }
      for (const total of Object.values(stackTotals)) {
        if (total > max) {
          max = total;
        }
      }
    }
    return [0, max];
  }, [data, bars]);

  return (
    <ChartContainer config={config} className={className}>
      <RechartsBarChart
        data={data}
        accessibilityLayer
        barSize={barSize}
        barCategoryGap={barCategoryGap}
        compact={false}
      >
        <Customized component={PlotAreaBackground} />
        {showXAxis && (
          <XAxis
            dataKey={xAxisKey}
            tickLine={false}
            tickMargin={20}
            axisLine={false}
            tickFormatter={xAxisTickFormatter}
            tick={{
              fill: 'hsl(var(--foreground))',
            }}
          />
        )}
        <YAxis
          tickFormatter={yAxisTickFormatter}
          tickLine={false}
          axisLine={false}
          tick={{
            fill: 'hsl(var(--foreground))',
          }}
          domain={yAxisDomain}
          allowDataOverflow
          hide={!showYAxis}
        />
        {showTooltip && (
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        )}
        {showLegend && (
          <ChartLegend
            verticalAlign="top"
            content={
              <ChartLegendContent
                className={legendClassName}
                onItemClick={toggleKey}
                hiddenKeys={hiddenKeys}
              />
            }
          />
        )}
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            fill={`var(--color-${bar.dataKey})`}
            radius={bar.radius ?? 4}
            stackId={bar.stackId}
            hide={hiddenKeys.has(bar.dataKey)}
          />
        ))}
      </RechartsBarChart>
    </ChartContainer>
  );
}
