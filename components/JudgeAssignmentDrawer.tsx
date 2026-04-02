'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ProviderBadge } from '@/components/ProviderBadge';
import { QUESTION_TEMPLATES } from '@/data/mockSubmissions';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
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
}

function TemplateAssignment({ templateId, assignment, onUpdate, activeJudges }: TemplateAssignmentProps) {
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const questionText = QUESTION_TEMPLATES[templateId] || 'Unknown question';

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
    <div className="border-b border-slate-200 py-4 last:border-0 dark:border-slate-700">
      <h4 className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
        {templateId}
      </h4>
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{questionText}</p>

      <div className="mb-3 flex flex-wrap gap-2">
        {activeJudges.map((judge) => (
          <button
            key={judge.id}
            type="button"
            onClick={() => toggleJudge(judge.id)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
              assignment.judgeIds.includes(judge.id)
                ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/50'
                : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
            )}
          >
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {judge.name}
            </span>
            <ProviderBadge provider={judge.provider} model={judge.model_name} />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setIsConfigExpanded(!isConfigExpanded)}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
      >
        {isConfigExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        Prompt Config
      </button>

      {isConfigExpanded && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={assignment.includeQuestionText}
              onCheckedChange={() => toggleConfig('includeQuestionText')}
            />
            <span className="text-slate-700 dark:text-slate-300">Include question text</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={assignment.includeAnswerChoice}
              onCheckedChange={() => toggleConfig('includeAnswerChoice')}
            />
            <span className="text-slate-700 dark:text-slate-300">Include answer choice</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={assignment.includeAnswerReasoning}
              onCheckedChange={() => toggleConfig('includeAnswerReasoning')}
            />
            <span className="text-slate-700 dark:text-slate-300">Include answer reasoning</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={assignment.includeQuestionType}
              onCheckedChange={() => toggleConfig('includeQuestionType')}
            />
            <span className="text-slate-700 dark:text-slate-300">Include question type</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={assignment.includeSubmissionMetadata}
              onCheckedChange={() => toggleConfig('includeSubmissionMetadata')}
            />
            <span className="text-slate-700 dark:text-slate-300">
              Include submission metadata
            </span>
          </label>
        </div>
      )}

      <p className="mt-2 text-xs text-slate-400">
        {assignment.judgeIds.length} judges assigned
      </p>
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Assign Judges to Questions</SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          {templates.map((templateId) => (
            <TemplateAssignment
              key={templateId}
              templateId={templateId}
              assignment={assignments[templateId] ?? makeDefaultAssignment(templateId)}
              onUpdate={(assignment) => updateAssignment(templateId, assignment)}
              activeJudges={activeJudges}
            />
          ))}
        </div>

        <SheetFooter className="mt-6">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Save Assignments
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
