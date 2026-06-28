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

import { trafficTrend } from "@/lib/mock-data";

export function TrafficChart() {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trafficTrend} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#157f74" stopOpacity={0.24} />
              <stop offset="95%" stopColor="#157f74" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="uv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e5eaf0" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={42} />
          <Tooltip
            contentStyle={{
              border: "1px solid #d9e0e7",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
            }}
          />
          <Area type="monotone" dataKey="pv" name="PV" stroke="#157f74" fill="url(#pv)" strokeWidth={2} />
          <Area type="monotone" dataKey="uv" name="UV" stroke="#2563eb" fill="url(#uv)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
