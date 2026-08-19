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

export function ActivityChart({ data }: { data: ActivityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
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
        <CartesianGrid stroke="#242938" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fill: "#626a7e", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#626a7e", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            background: "#12151f",
            border: "1px solid #333a4d",
            borderRadius: 10,
            fontSize: 12,
          }}
          labelStyle={{ color: "#949cb0" }}
        />
        <Area
          type="monotone"
          dataKey="dms"
          name="DMs enviadas"
          stroke="#7c5cff"
          strokeWidth={2}
          fill="url(#gDms)"
        />
        <Area
          type="monotone"
          dataKey="comentarios"
          name="Comentários"
          stroke="#34d399"
          strokeWidth={2}
          fill="url(#gComments)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
