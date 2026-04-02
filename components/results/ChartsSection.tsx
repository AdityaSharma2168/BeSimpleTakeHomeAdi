'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { Evaluation } from '@/lib/types';

interface ChartsSectionProps {
  evaluations: Evaluation[];
}

export function ChartsSection({ evaluations }: ChartsSectionProps) {
  const passRateByJudge = useMemo(() => {
    const judgeStats: Record<string, { pass: number; total: number; name: string }> = {};
    evaluations.forEach((e) => {
      if (!judgeStats[e.judge_id]) {
        judgeStats[e.judge_id] = { pass: 0, total: 0, name: e.judge_name };
      }
      judgeStats[e.judge_id].total++;
      if (e.verdict === 'pass') judgeStats[e.judge_id].pass++;
    });
    return Object.entries(judgeStats)
      .map(([, stats]) => ({
        name: stats.name,
        passRate: Math.round((stats.pass / stats.total) * 100),
      }))
      .sort((a, b) => b.passRate - a.passRate);
  }, [evaluations]);

  const verdictDistribution = useMemo(() => {
    const counts = { pass: 0, fail: 0, inconclusive: 0 };
    evaluations.forEach((e) => counts[e.verdict]++);

    const total = counts.pass + counts.fail + counts.inconclusive;
    return [
      {
        name: 'Pass',
        value: counts.pass,
        percent: total ? Math.round((counts.pass / total) * 100) : 0,
        color: '#10b981',
      },
      {
        name: 'Fail',
        value: counts.fail,
        percent: total ? Math.round((counts.fail / total) * 100) : 0,
        color: '#f43f5e',
      },
      {
        name: 'Inconclusive',
        value: counts.inconclusive,
        percent: total ? Math.round((counts.inconclusive / total) * 100) : 0,
        color: '#94a3b8',
      },
    ];
  }, [evaluations]);

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
        <h3 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
          Pass Rate by Judge
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={passRateByJudge} layout="vertical">
            <XAxis
              type="number"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: 'currentColor', fontSize: 12 }}
              stroke="currentColor"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fill: 'currentColor', fontSize: 12 }}
            />
            <Bar
              dataKey="passRate"
              fill="#6366f1"
              radius={[0, 6, 6, 0]}
              barSize={18}
              label={{ position: 'right', fill: 'currentColor', fontSize: 12, formatter: (v: number) => `${v}%` }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
          Verdict Distribution
        </h3>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={200}>
          <PieChart>
            <Pie
              data={verdictDistribution}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={65}
              dataKey="value"
              label={false}
            >
              {verdictDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
          </ResponsiveContainer>

          <div className="flex flex-col gap-2 text-xs">
            {verdictDistribution.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {entry.name}
                </span>
                <span className="ml-auto text-slate-500 dark:text-slate-400">
                  {entry.value} ({entry.percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChartsSectionSkeleton() {
  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="h-[200px] w-full" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Skeleton className="mb-4 h-5 w-36" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    </div>
  );
}
