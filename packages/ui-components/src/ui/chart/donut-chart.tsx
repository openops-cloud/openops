import * as React from 'react';
import { Pie, PieChart as RechartsPieChart } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from './chart';

const RADIAN = Math.PI / 180;

type RadialLabelProps = {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  name: string;
  fill: string;
  config: ChartConfig;
  value: number;
};

function RadialLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  name,
  fill,
  config,
  value,
}: RadialLabelProps): React.JSX.Element | null {
  if (!value) {
    return null;
  }
  const GAP = 24;
  const DOT_RADIUS = 4;
  const x = cx + (outerRadius + GAP) * Math.cos(-midAngle * RADIAN);
  const y = cy + (outerRadius + GAP) * Math.sin(-midAngle * RADIAN);

  const label = config[name]?.label ?? name;
  const isRight = x >= cx;

  return (
    <g>
      <circle cx={x} cy={y} r={DOT_RADIUS} fill={fill} />
      <text
        x={x + (isRight ? DOT_RADIUS + 4 : -(DOT_RADIUS + 4))}
        y={y}
        textAnchor={isRight ? 'start' : 'end'}
        dominantBaseline="central"
        className="fill-foreground text-xs"
        style={{ fontSize: 12 }}
      >
        {label}
      </text>
    </g>
  );
}

export type DonutChartProps = {
  data: { name: string; value: number }[];
  config: ChartConfig;
  innerRadius?: number;
  outerRadius?: number;
  showTooltip?: boolean;
  showLegend?: boolean;
  className?: string;
};

export function DonutChart({
  data,
  config,
  innerRadius = 60,
  outerRadius = 90,
  showTooltip = true,
  showLegend = true,
  className,
}: DonutChartProps): React.JSX.Element {
  const isEmpty = data.every((entry) => !entry.value);
  const mappedData = isEmpty
    ? [{ name: '__empty__', value: 1, fill: 'hsl(var(--muted))' }]
    : data.map((entry) => ({
        ...entry,
        fill: `var(--color-${entry.name})`,
      }));

  return (
    <ChartContainer config={config} className={className}>
      <RechartsPieChart accessibilityLayer>
        {showTooltip && !isEmpty && (
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
        )}
        <Pie
          data={mappedData}
          dataKey="value"
          nameKey="name"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          label={
            showLegend && !isEmpty
              ? (props) => (
                  <RadialLabel
                    key={props.name}
                    cx={props.cx}
                    cy={props.cy}
                    midAngle={props.midAngle}
                    outerRadius={props.outerRadius}
                    name={props.name}
                    fill={props.fill}
                    config={config}
                    value={props.value}
                  />
                )
              : false
          }
          labelLine={false}
        />
      </RechartsPieChart>
    </ChartContainer>
  );
}
