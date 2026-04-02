'use client';

import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Skeleton } from '@/components/ui/skeleton';

interface StatsCardProps {
  label: string;
  value: number;
  suffix?: string;
  subtext?: string;
}

function StatsCard({ label, value, suffix, subtext }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
        <AnimatedCounter value={value} suffix={suffix} />
      </p>
      {subtext && (
        <p className="mt-0.5 text-xs text-slate-400">{subtext}</p>
      )}
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-2 h-8 w-16" />
      <Skeleton className="mt-1.5 h-3 w-24" />
    </div>
  );
}

interface Stats {
  total: number;
  passCount: number;
  passRate: number;
  uniqueJudges: number;
  avgLatency: number;
}

interface StatsOverviewProps {
  stats: Stats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        label="Pass Rate"
        value={stats.passRate}
        suffix="%"
        subtext={`${stats.passCount} of ${stats.total} evaluations`}
      />
      <StatsCard
        label="Total Evaluations"
        value={stats.total}
        subtext="evaluations run"
      />
      <StatsCard
        label="Judges Used"
        value={stats.uniqueJudges}
        subtext="active judges"
      />
      <StatsCard
        label="Avg Latency"
        value={stats.avgLatency}
        suffix="ms"
        subtext="average response time"
      />
    </div>
  );
}

export function StatsOverviewSkeleton() {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>
  );
}
