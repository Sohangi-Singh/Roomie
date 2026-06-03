"use client";

import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { RadarPoint } from "@/lib/matching";
import { getRadarTokens } from "@/config/tokens";
import { useThemeStore } from "@/stores/themeStore";

export function RadarChart({
  data,
  height = 240,
  showLabels = true,
}: {
  data: RadarPoint[];
  height?: number;
  showLabels?: boolean;
}) {
  const dark = useThemeStore((s) => s.theme === "dark");
  const tokens = getRadarTokens(dark);
  const chartData = data.map((d) => ({ axis: d.label, score: d.score }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadar data={chartData} outerRadius="70%">
          <PolarGrid stroke={tokens.grid} />
          {showLabels && (
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: tokens.axisLabel, fontSize: 10 }}
            />
          )}
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={false}
            axisLine={false}
            tickCount={5}
          />
          <Radar
            dataKey="score"
            stroke={tokens.stroke}
            fill={tokens.fill}
            fillOpacity={0.35}
            strokeWidth={2}
            isAnimationActive
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
