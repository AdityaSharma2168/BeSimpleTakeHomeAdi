'use client';

import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { VerdictBadge } from '@/components/VerdictBadge';
import { ProviderBadge } from '@/components/ProviderBadge';
import type { Evaluation } from '@/lib/types';

interface CompareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluations: Evaluation[];
}

export function CompareModal({ open, onOpenChange, evaluations }: CompareModalProps) {
  const verdicts = useMemo(() => new Set(evaluations.map((e) => e.verdict)), [evaluations]);
  const disagree = verdicts.size > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Compare Evaluations</DialogTitle>
          <DialogDescription>Compare results from different judges</DialogDescription>
        </DialogHeader>

        {disagree && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
            <AlertTriangle className="size-4" />
            Judges disagree on this evaluation
          </div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {evaluations.map((evaluation) => (
            <div
              key={evaluation.id}
              className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
            >
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-medium text-slate-900 dark:text-slate-100">
                  {evaluation.judge_name}
                </h4>
                <VerdictBadge verdict={evaluation.verdict} />
              </div>

              <div className="mb-3">
                <ProviderBadge
                  provider={evaluation.judge_provider}
                  model={evaluation.judge_model}
                />
              </div>

              <div className="mb-3">
                <h5 className="mb-1 text-xs font-medium text-slate-500">Reasoning</h5>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {evaluation.reasoning}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-slate-500">Latency</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {evaluation.latency_ms}ms
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Tokens</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {evaluation.tokens_used}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
