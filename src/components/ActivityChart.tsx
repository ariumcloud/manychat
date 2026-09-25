"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ActivityPoint = { day: string; dms: number; comentarios: number };

export function ActivityChart({ data, height = 220 }: { data: ActivityPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="gDms" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#7c5cff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gComments" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1e2230" vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="day"
          tick={{ fill: "#6b7387", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6b7387", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={34}
        />
        <Tooltip
          cursor={{ stroke: "#2c3242", strokeWidth: 1 }}
          contentStyle={{
            background: "rgba(15,17,26,0.96)",
            border: "1px solid #2c3242",
            borderRadius: 12,
            fontSize: 12,
            boxShadow: "0 18px 48px -12px rgba(0,0,0,0.65)",
            padding: "8px 12px",
          }}
          labelStyle={{ color: "#9aa2b8" }}
        />
        <Area
          type="monotone"
          dataKey="dms"
          name="DMs enviadas"
          stroke="#7c5cff"
          strokeWidth={2.4}
          fill="url(#gDms)"
        />
        <Area
          type="monotone"
          dataKey="comentarios"
          name="Comentários"
          stroke="#34d399"
          strokeWidth={2.4}
          fill="url(#gComments)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
