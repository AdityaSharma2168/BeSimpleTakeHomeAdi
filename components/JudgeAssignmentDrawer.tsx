'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, Check, Settings2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ProviderDot } from '@/components/ProviderBadge';
import { QUESTION_TEMPLATES } from '@/data/mockSubmissions';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { JudgeAssignment, Judge } from '@/lib/types';

interface JudgeAssignmentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: string[];
  judges: Judge[];
}

interface TemplateAssignmentProps {
  templateId: string;
  assignment: JudgeAssignment;
  onUpdate: (assignment: JudgeAssignment) => void;
  activeJudges: Judge[];
  index: number;
}

function TemplateAssignment({ templateId, assignment, onUpdate, activeJudges, index }: TemplateAssignmentProps) {
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const questionText = QUESTION_TEMPLATES[templateId] || 'Unknown question';
  const assignedCount = assignment.judgeIds.length;

  const toggleJudge = (judgeId: string) => {
    const newJudgeIds = assignment.judgeIds.includes(judgeId)
      ? assignment.judgeIds.filter((id) => id !== judgeId)
      : [...assignment.judgeIds, judgeId];
    onUpdate({ ...assignment, judgeIds: newJudgeIds });
  };

  const toggleConfig = (key: keyof Omit<JudgeAssignment, 'templateId' | 'judgeIds'>) => {
    onUpdate({ ...assignment, [key]: !assignment[key] });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
      {/* Question Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {index + 1}
            </span>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
              {templateId}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-700">
            <Users className="size-3 text-slate-500 dark:text-slate-400" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {assignedCount}
            </span>
          </div>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {questionText}
        </p>
      </div>

      {/* Judge Selection */}
      <div className="mb-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Select Judges
        </p>
        <div className="flex flex-wrap gap-2">
          {activeJudges.map((judge) => {
            const isSelected = assignment.judgeIds.includes(judge.id);
            return (
              <button
                key={judge.id}
                type="button"
                onClick={() => toggleJudge(judge.id)}
                className={cn(
                  'group relative flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all duration-150',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500/20 dark:border-indigo-500 dark:bg-indigo-950/30 dark:ring-indigo-500/10'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-700/50'
                )}
              >
                <div
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700'
                  )}
                >
                  {isSelected && <Check className="size-3" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {judge.name}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <ProviderDot provider={judge.provider} className="size-1.5" />
                    {judge.model_name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Config Collapsible */}
      <Collapsible open={isConfigExpanded} onOpenChange={setIsConfigExpanded}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/50"
          >
            <Settings2 className="size-4 text-slate-500 dark:text-slate-400" />
            <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              Prompt Configuration
            </span>
            <ChevronDown
              className={cn(
                'size-4 text-slate-400 transition-transform duration-200',
                isConfigExpanded && 'rotate-180'
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 grid gap-1 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            {[
              { key: 'includeQuestionText', label: 'Question text' },
              { key: 'includeAnswerChoice', label: 'Answer choice' },
              { key: 'includeAnswerReasoning', label: 'Answer reasoning' },
              { key: 'includeQuestionType', label: 'Question type' },
              { key: 'includeSubmissionMetadata', label: 'Submission metadata' },
            ].map(({ key, label }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700/50"
              >
                <Checkbox
                  checked={assignment[key as keyof JudgeAssignment] as boolean}
                  onCheckedChange={() =>
                    toggleConfig(key as keyof Omit<JudgeAssignment, 'templateId' | 'judgeIds'>)
                  }
                  className="data-[state=checked]:border-indigo-500 data-[state=checked]:bg-indigo-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
              </label>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function JudgeAssignmentDrawer({ open, onOpenChange, templates, judges }: JudgeAssignmentDrawerProps) {
  const activeJudges = judges.filter((j) => j.active);

  const { queueId } = useParams<{ queueId: string }>();

  const makeDefaultAssignment = useCallback(
    (templateId: string): JudgeAssignment => ({
      templateId,
      judgeIds: [],
      includeQuestionText: true,
      includeAnswerChoice: true,
      includeAnswerReasoning: true,
      includeQuestionType: false,
      includeSubmissionMetadata: false,
    }),
    [],
  );

  const [assignments, setAssignments] = useState<Record<string, JudgeAssignment>>(() => {
    const initial: Record<string, JudgeAssignment> = {};
    templates.forEach((templateId) => {
      initial[templateId] = makeDefaultAssignment(templateId);
    });
    return initial;
  });

  // Ensure we always have an assignment object for the currently available templates.
  // `templates` can change after initial mount (because queue detail data loads async),
  // so the initial state may be empty while the drawer UI renders.
  useEffect(() => {
    if (templates.length === 0) return;

    setAssignments((prev) => {
      const next: Record<string, JudgeAssignment> = { ...prev };
      for (const templateId of templates) {
        if (!next[templateId]) next[templateId] = makeDefaultAssignment(templateId);
      }
      return next;
    });
  }, [templates, makeDefaultAssignment]);

  const updateAssignment = useCallback((templateId: string, assignment: JudgeAssignment) => {
    setAssignments((prev) => ({ ...prev, [templateId]: assignment }));
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!queueId) return;
    if (templates.length === 0) return;

    const loadAssignments = async (): Promise<void> => {
      const initial: Record<string, JudgeAssignment> = {};
      templates.forEach((templateId) => {
        initial[templateId] = makeDefaultAssignment(templateId);
      });

      try {
        const { data, error } = await supabase
          .from('judge_assignments')
          .select('judge_id, question_template_id, prompt_config')
          .eq('queue_id', queueId)
          .in('question_template_id', templates);

        if (error) throw error;

        const rows = (Array.isArray(data) ? data : []) as Array<{
          judge_id: string;
          question_template_id: string;
          prompt_config: unknown;
        }>;

        const toBool = (v: unknown): boolean => v === true;

        for (const row of rows) {
          const templateId = row.question_template_id;
          if (!initial[templateId]) continue;

          initial[templateId].judgeIds = Array.from(
            new Set([...initial[templateId].judgeIds, row.judge_id]),
          );

          if (row.prompt_config && typeof row.prompt_config === 'object') {
            const pc = row.prompt_config as Record<string, unknown>;
            initial[templateId] = {
              ...initial[templateId],
              includeQuestionText: toBool(pc.include_question_text),
              includeAnswerChoice: toBool(pc.include_answer_choice),
              includeAnswerReasoning: toBool(pc.include_answer_reasoning),
              includeQuestionType: toBool(pc.include_question_type),
              includeSubmissionMetadata: toBool(pc.include_metadata),
            };
          }
        }

        setAssignments(initial);
      } catch {
        toast.error('Failed to load judge assignments');
        setAssignments(initial);
      }
    };

    loadAssignments().catch(() => {
      // handled inside
    });
  }, [makeDefaultAssignment, open, queueId, templates]);

  const handleSave = useCallback(async () => {
    if (!queueId) return;

    try {
      if (templates.length > 0) {
        await supabase
          .from('judge_assignments')
          .delete()
          .eq('queue_id', queueId)
          .in('question_template_id', templates);
      }

      const upserts: Array<{
        judge_id: string;
        queue_id: string;
        question_template_id: string;
        prompt_config: unknown;
      }> = [];

      for (const templateId of templates) {
        const a = assignments[templateId];
        if (!a) continue;

        const prompt_config = {
          include_question_text: a.includeQuestionText,
          include_answer_choice: a.includeAnswerChoice,
          include_answer_reasoning: a.includeAnswerReasoning,
          include_question_type: a.includeQuestionType,
          include_metadata: a.includeSubmissionMetadata,
        };

        for (const judgeId of a.judgeIds) {
          upserts.push({
            judge_id: judgeId,
            queue_id: queueId,
            question_template_id: templateId,
            prompt_config,
          });
        }
      }

      if (upserts.length > 0) {
        const { error } = await supabase
          .from('judge_assignments')
          .upsert(upserts, { onConflict: 'judge_id,queue_id,question_template_id' });
        if (error) throw error;
      }

      toast.success('Judge assignments saved');
      onOpenChange(false);
    } catch {
      toast.error('Failed to save judge assignments');
    }
  }, [assignments, onOpenChange, queueId, templates]);

  const totalAssigned = Object.values(assignments).reduce(
    (sum, a) => sum + a.judgeIds.length,
    0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px]">
        {/* Header */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
          <SheetHeader className="space-y-1">
            <SheetTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Assign Judges to Questions
            </SheetTitle>
            <SheetDescription className="text-sm text-slate-500 dark:text-slate-400">
              {templates.length} question{templates.length !== 1 ? 's' : ''} &middot;{' '}
              {totalAssigned} judge assignment{totalAssigned !== 1 ? 's' : ''}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 dark:bg-slate-900/50">
          <div className="flex flex-col gap-3">
            {templates.map((templateId, index) => (
              <TemplateAssignment
                key={templateId}
                templateId={templateId}
                assignment={assignments[templateId] ?? makeDefaultAssignment(templateId)}
                onUpdate={(assignment) => updateAssignment(templateId, assignment)}
                activeJudges={activeJudges}
                index={index}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-indigo-600 px-4 text-white hover:bg-indigo-700"
            >
              Save Assignments
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
