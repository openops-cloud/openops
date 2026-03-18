import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
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
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const yAxisDomain = useMemo<[number, number]>(() => {
    let max = 0;
    for (const row of data) {
      for (const bar of bars) {
        const v = Number(row[bar.dataKey] ?? 0);
        if (v > max) {
          max = v;
        }
      }
    }
    return [0, max];
  }, [data, bars]);

  const toggleKey = useCallback((key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

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
