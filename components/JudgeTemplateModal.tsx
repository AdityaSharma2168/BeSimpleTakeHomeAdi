'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProviderBadge } from '@/components/ProviderBadge';
import { JUDGE_TEMPLATES } from '@/data/mockJudges';
import { cn } from '@/lib/utils';
import type { Provider } from '@/lib/types';

interface JudgeTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: { name: string; prompt: string; model: string; provider: Provider }) => void;
}

export function JudgeTemplateModal({ open, onOpenChange, onSelect }: JudgeTemplateModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = useCallback(() => {
    if (selectedIndex !== null) {
      const template = JUDGE_TEMPLATES[selectedIndex];
      onSelect(template);
      setSelectedIndex(null);
    }
  }, [selectedIndex, onSelect]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setSelectedIndex(null);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>Select a pre-configured judge template</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4 sm:grid-cols-2">
          {JUDGE_TEMPLATES.map((template, index) => (
            <button
              key={template.name}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={cn(
                'flex flex-col items-start rounded-lg border p-4 text-left transition-all',
                selectedIndex === index
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500 dark:bg-indigo-950/30'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
              )}
            >
              <h4 className="font-medium text-slate-900 dark:text-slate-100">
                {template.name}
              </h4>
              <div className="mt-1">
                <ProviderBadge provider={template.provider} model={template.model} />
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                {template.prompt}
              </p>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={selectedIndex === null}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Use Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
