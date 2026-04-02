'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface RunEvaluationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: () => void;
  evaluationCount: number;
  judgeCount: number;
  submissionCount: number;
}

export function RunEvaluationModal({
  open,
  onOpenChange,
  onStart,
  evaluationCount,
  judgeCount,
  submissionCount,
}: RunEvaluationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run Evaluations</DialogTitle>
          <DialogDescription>Review and start evaluation jobs</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            This will create{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {evaluationCount} evaluations
            </span>{' '}
            across{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {judgeCount} judges
            </span>{' '}
            and{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {submissionCount} submissions
            </span>
          </p>

          <div className="mt-4 flex gap-6">
            <div>
              <p className="text-xs font-medium text-slate-500">Estimated cost</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                ~$0.06
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Estimated time</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                ~30 seconds
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onStart}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Start Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
