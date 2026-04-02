import { cn } from '@/lib/utils';
import type { Verdict } from '@/lib/types';

interface VerdictBadgeProps {
  verdict: Verdict;
  className?: string;
}

const VERDICT_STYLES: Record<Verdict, string> = {
  pass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  fail: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
  inconclusive: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const VERDICT_DOT_STYLES: Record<Verdict, string> = {
  pass: 'bg-emerald-500',
  fail: 'bg-rose-500',
  inconclusive: 'bg-slate-400',
};

const VERDICT_LABELS: Record<Verdict, string> = {
  pass: 'Pass',
  fail: 'Fail',
  inconclusive: 'Inconclusive',
};

export function VerdictBadge({ verdict, className }: VerdictBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        VERDICT_STYLES[verdict],
        className
      )}
    >
      <span className={cn('size-1.5 rounded-full', VERDICT_DOT_STYLES[verdict])} />
      {VERDICT_LABELS[verdict]}
    </span>
  );
}
