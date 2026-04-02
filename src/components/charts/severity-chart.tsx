"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { Finding } from "@/lib/contracts/domain";

const severityOrder = ["critical", "high", "medium", "low", "info"] as const;

export function SeverityChart({ findings }: { findings: Finding[] }) {
  const data = severityOrder.map((severity) => ({
    severity,
    count: findings.filter((finding) => finding.severity === severity).length,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="severity" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#020617",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
          <Bar
            dataKey="count"
            radius={[8, 8, 0, 0]}
            fill="url(#severityGradient)"
          />
          <defs>
            <linearGradient id="severityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.9} />
              <stop offset="95%" stopColor="#0f172a" stopOpacity={0.4} />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
