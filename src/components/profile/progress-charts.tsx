"use client";

import type { ChartDataPoint } from "@/types/analytics";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface ProgressChartsProps {
  weeklyData: ChartDataPoint[];
  monthlyData: ChartDataPoint[];
  joinedAt?: number;
}

import { formatDurationShort } from "@/lib/time";

function ChartTooltip({ active, payload, label, joinedAt }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as ChartDataPoint;
  
  const isBeforeJoined = joinedAt && new Date(data.dateKey).getTime() < new Date(new Date(joinedAt).toISOString().split('T')[0]).getTime();
  const isJoinedDate = joinedAt && data.dateKey === new Date(joinedAt).toISOString().split('T')[0];

  return (
    <div className="card px-3 py-2 text-xs">
      <p className="font-medium text-brown">{label}</p>
      {isJoinedDate && (
        <div className="mb-1 mt-1 rounded bg-sage/10 px-1 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-sage w-fit">
          Joined Focus
        </div>
      )}
      <p className="text-terracotta">
        {data.totalMs === 0 
          ? (isBeforeJoined ? "Not joined yet" : "No focus") 
          : formatDurationShort(data.totalMs)}
      </p>
    </div>
  );
}

import { Lock } from "lucide-react";

export function ProgressCharts({ weeklyData, monthlyData, joinedAt }: ProgressChartsProps) {
  const msSinceJoined = joinedAt ? Date.now() - joinedAt : 0;
  const daysSinceJoined = Math.floor(msSinceJoined / (1000 * 60 * 60 * 24));
  
  const isMonthlyLocked = daysSinceJoined < 60;

  // Find if joinedAt is in the weekly or monthly data
  let joinedWeeklyLabel: string | undefined;
  let joinedMonthlyLabel: string | undefined;
  
  if (joinedAt) {
    const joinedDk = new Date(joinedAt).toISOString().split('T')[0];
    
    // Check if joined date matches any exact day in weekly data
    const weeklyMatch = weeklyData.find(d => d.dateKey === joinedDk);
    if (weeklyMatch) joinedWeeklyLabel = weeklyMatch.label;
    
    // For monthly, it's a range of days (dateKey is start of week)
    const joinedTime = new Date(joinedDk).getTime();
    for (let i = 0; i < monthlyData.length; i++) {
      const weekStart = new Date(monthlyData[i].dateKey).getTime();
      const nextWeekStart = i < monthlyData.length - 1 
        ? new Date(monthlyData[i+1].dateKey).getTime() 
        : Date.now();
      
      if (joinedTime >= weekStart && joinedTime < nextWeekStart) {
        joinedMonthlyLabel = monthlyData[i].label;
        break;
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="card px-4 py-5">
        <h3 className="mb-4 font-serif text-lg text-brown">This Week</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradientTerracotta" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c4704b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#c4704b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8dfd3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#7a6f63" }}
                axisLine={{ stroke: "#e8dfd3" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#7a6f63" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => {
                  if (v === 0) return "0m";
                  const mins = Math.round(v * 60);
                  if (mins < 60) return `${mins}m`;
                  if (mins % 60 === 0) return `${mins / 60}h`;
                  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
                }}
              />
              <Tooltip content={<ChartTooltip joinedAt={joinedAt} />} />
              {joinedWeeklyLabel && (
                <ReferenceLine x={joinedWeeklyLabel} stroke="#6b8f71" strokeDasharray="3 3">
                  <text fill="#6b8f71" fontSize={10} x="50%" dy={-10} textAnchor="middle">Joined Focus</text>
                </ReferenceLine>
              )}
              <Area
                type="monotone"
                dataKey="hours"
                stroke="#c4704b"
                strokeWidth={2}
                fill="url(#gradientTerracotta)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card px-4 py-5 relative overflow-hidden">
        <h3 className="mb-4 font-serif text-lg text-brown">Monthly Overview</h3>
        <div className={`h-48 transition-all ${isMonthlyLocked ? "blur-md opacity-40 select-none" : ""}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradientSage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6b8f71" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6b8f71" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8dfd3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#7a6f63" }}
                axisLine={{ stroke: "#e8dfd3" }}
                tickLine={false}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#7a6f63" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => {
                  if (v === 0) return "0m";
                  const mins = Math.round(v * 60);
                  if (mins < 60) return `${mins}m`;
                  if (mins % 60 === 0) return `${mins / 60}h`;
                  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
                }}
              />
              <Tooltip content={<ChartTooltip joinedAt={joinedAt} />} />
              {joinedMonthlyLabel && !isMonthlyLocked && (
                <ReferenceLine x={joinedMonthlyLabel} stroke="#c4704b" strokeDasharray="3 3">
                  <text fill="#c4704b" fontSize={10} x="50%" dy={-10} textAnchor="middle">Joined Focus</text>
                </ReferenceLine>
              )}
              <Area
                type="monotone"
                dataKey="hours"
                stroke="#6b8f71"
                strokeWidth={2}
                fill="url(#gradientSage)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {isMonthlyLocked && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-sand/30 backdrop-blur-[2px]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-dark shadow-sm mb-3">
              <Lock className="h-5 w-5 text-brown-muted" />
            </div>
            <p className="text-sm font-medium text-brown">Monthly Overview Locked</p>
            <p className="text-xs text-brown-muted mt-1">Join for 2 months to unlock.</p>
          </div>
        )}
      </div>
    </div>
  );
}
