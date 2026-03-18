import * as React from 'react';
import { Bar, ComposedChart, Customized, Line, XAxis, YAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  PlotAreaBackground,
} from './chart';

export type ComboChartBarDefinition = {
  dataKey: string;
  radius?: number | [number, number, number, number];
  stackId?: string;
};

export type ComboChartLineDefinition = {
  dataKey: string;
  dot?: boolean;
  strokeWidth?: number;
  type?: 'monotone' | 'natural' | 'linear' | 'step';
};

export type ComboChartProps = {
  data: Record<string, unknown>[];
  config: ChartConfig;
  bars: ComboChartBarDefinition[];
  lines: ComboChartLineDefinition[];
  leftYAxisTickFormatter?: (value: any) => string;
  rightYAxisTickFormatter?: (value: any) => string;
  xAxisTickFormatter?: (value: any) => string;
  xAxisKey?: string;
  showXAxis?: boolean;
  showLeftYAxis?: boolean;
  showRightYAxis?: boolean;
  leftYAxisTicks?: number[];
  rightYAxisTicks?: number[];
  leftYAxisDomain?: [number | string, number | string];
  rightYAxisDomain?: [number | string, number | string];
  showTooltip?: boolean;
  showLegend?: boolean;
  barSize?: number;
  barCategoryGap?: number | string;
  legendClassName?: string;
  className?: string;
};

export function ComboChart({
  data,
  config,
  bars,
  lines,
  leftYAxisTickFormatter,
  rightYAxisTickFormatter,
  xAxisTickFormatter,
  xAxisKey = 'name',
  showXAxis = true,
  showLeftYAxis = false,
  showRightYAxis = false,
  leftYAxisTicks,
  rightYAxisTicks,
  leftYAxisDomain,
  rightYAxisDomain,
  showTooltip = true,
  showLegend = false,
  barSize,
  barCategoryGap,
  legendClassName,
  className,
}: ComboChartProps): React.JSX.Element {
  return (
    <ChartContainer config={config} className={className}>
      <ComposedChart
        data={data}
        accessibilityLayer
        barSize={barSize}
        barCategoryGap={barCategoryGap}
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
          yAxisId="left"
          orientation="left"
          hide={!showLeftYAxis}
          tickFormatter={leftYAxisTickFormatter}
          tickLine={false}
          axisLine={false}
          ticks={leftYAxisTicks}
          domain={leftYAxisDomain}
          tick={{
            fill: 'hsl(var(--foreground))',
          }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          hide={!showRightYAxis}
          tickFormatter={rightYAxisTickFormatter}
          tickLine={false}
          axisLine={false}
          ticks={rightYAxisTicks}
          domain={rightYAxisDomain}
          tick={{
            fill: 'hsl(var(--foreground))',
          }}
        />
        {showTooltip && (
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        )}
        {showLegend && (
          <ChartLegend
            verticalAlign="top"
            content={<ChartLegendContent className={legendClassName} />}
          />
        )}
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            yAxisId="left"
            dataKey={bar.dataKey}
            fill={`var(--color-${bar.dataKey})`}
            radius={bar.radius ?? 4}
            stackId={bar.stackId}
          />
        ))}
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            yAxisId="right"
            dataKey={line.dataKey}
            stroke={`var(--color-${line.dataKey})`}
            dot={line.dot ?? false}
            strokeWidth={line.strokeWidth ?? 2}
            type={line.type ?? 'monotone'}
          />
        ))}
      </ComposedChart>
    </ChartContainer>
  );
}
