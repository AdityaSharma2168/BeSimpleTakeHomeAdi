'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Queue, Submission, EvalLogEntry, SubmissionAttachment } from '@/lib/types';

interface UseSubmissionsReturn {
  queues: Queue[];
  isLoading: boolean;
  uploadSubmissions: (submissions: ParsedSubmission[]) => Promise<{ submissionCount: number; queueCount: number }>;
}

interface UseQueueDetailReturn {
  submissions: Submission[];
  templates: string[];
  isLoading: boolean;
  evalLog: EvalLogEntry[];
  refetch: () => Promise<void>;
}

export interface ParsedSubmission {
  id: string;
  queueId: string;
  subjectMetadata?: Record<string, unknown>;
  attachments?: { fileName: string }[];
  questions: {
    templateId: string;
    questionText: string;
    answer: string;
    answerReasoning?: string;
  }[];
}

function toDateOnly(isoOrDateString: string): string {
  const d = new Date(isoOrDateString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

type SupabaseSubmissionRow = {
  id: string;
  queue_id: string;
  submitted_at: string;
  raw_json?: unknown;
  attachments?: unknown;
};

type SupabaseQuestionRow = {
  submission_id: string;
  template_id: string;
};

type SupabaseEvaluationRow = {
  submission_id: string;
};

type SupabaseQuestionDetailRow = {
  submission_id: string;
  template_id: string;
  question_text: string;
};

type SupabaseAnswerDetailRow = {
  submission_id: string;
  template_id: string;
  choice: string | null;
  reasoning: string | null;
};

export function useSubmissions(): UseSubmissionsReturn {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueues = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { data: submissionRowsUnknown, error: submissionsError } = await supabase
        .from('submissions')
        .select('id,queue_id,submitted_at');

      if (submissionsError) throw submissionsError;

      const submissionRows = (Array.isArray(submissionRowsUnknown) ? submissionRowsUnknown : []) as unknown[];

      const submissions = submissionRows as SupabaseSubmissionRow[];

      const queueState = new Map<
        string,
        {
          submissionCount: number;
          lastSubmitted: string;
          lastSubmittedMs: number;
          templates: Set<string>;
        }
      >();

      const submissionIdToQueueId = new Map<string, string>();

      for (const s of submissions) {
        if (!s || typeof s !== 'object') continue;
        const submittedMs = Date.parse(s.submitted_at);
        if (!Number.isFinite(submittedMs)) continue;

        const existing = queueState.get(s.queue_id);
        if (!existing) {
          queueState.set(s.queue_id, {
            submissionCount: 1,
            lastSubmitted: toDateOnly(s.submitted_at),
            lastSubmittedMs: submittedMs,
            templates: new Set<string>(),
          });
        } else {
          existing.submissionCount += 1;
          if (submittedMs > existing.lastSubmittedMs) {
            existing.lastSubmittedMs = submittedMs;
            existing.lastSubmitted = toDateOnly(s.submitted_at);
          }
        }
        submissionIdToQueueId.set(s.id, s.queue_id);
      }

      const submissionIds = Array.from(submissionIdToQueueId.keys());

      if (submissionIds.length > 0) {
        const { data: questionRowsUnknown, error: questionsError } = await supabase
          .from('questions')
          .select('submission_id,template_id')
          .in('submission_id', submissionIds);

        if (questionsError) throw questionsError;

        const questionRows = (Array.isArray(questionRowsUnknown) ? questionRowsUnknown : []) as unknown[];
        const questions = questionRows as SupabaseQuestionRow[];

        for (const q of questions) {
          const queueId = submissionIdToQueueId.get(q.submission_id);
          if (!queueId) continue;
          const existing = queueState.get(queueId);
          if (!existing) continue;
          existing.templates.add(q.template_id);
        }
      }

      const nextQueues: Queue[] = Array.from(queueState.entries()).map(([id, v]) => ({
        id,
        submissionCount: v.submissionCount,
        templates: Array.from(v.templates),
        lastSubmitted: v.lastSubmitted,
      }));

      setQueues(nextQueues);
    } catch {
      toast.error('Failed to load queues');
      setQueues([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueues().catch(() => {
      // handled in fetchQueues
    });
  }, [fetchQueues]);

  const uploadSubmissions = useCallback(
    async (
      parsedSubmissions: ParsedSubmission[],
    ): Promise<{ submissionCount: number; queueCount: number }> => {
      if (parsedSubmissions.length === 0) {
        return { submissionCount: 0, queueCount: 0 };
      }

      setIsLoading(true);
      try {
        const ids = parsedSubmissions.map((s) => s.id);
        const { data: existingUnknown, error: existingError } = await supabase
          .from('submissions')
          .select('id')
          .in('id', ids);

        if (existingError) throw existingError;

        const existingRows = (Array.isArray(existingUnknown) ? existingUnknown : []) as unknown[];
        const existingIds = new Set<string>(
          existingRows
            .map((r) => (r && typeof r === 'object' ? (r as Record<string, unknown>).id : undefined))
            .filter((v): v is string => typeof v === 'string'),
        );

        const toInsert = parsedSubmissions.filter((s) => !existingIds.has(s.id));
        if (toInsert.length === 0) {
          await fetchQueues();
          return { submissionCount: 0, queueCount: 0 };
        }

        const nowIso = new Date().toISOString();

        const submissionsInsert = toInsert.map((ps) => ({
          id: ps.id,
          queue_id: ps.queueId,
          labeling_task_id: 'uploaded',
          submitted_at: nowIso,
          attachments: ps.attachments ?? [],
          raw_json: {
            id: ps.id,
            queueId: ps.queueId,
            subjectMetadata: ps.subjectMetadata ?? null,
            attachments: ps.attachments ?? [],
            questions: ps.questions,
          },
        }));

        const questionsInsert = toInsert.flatMap((ps) =>
          ps.questions.map((q) => ({
            submission_id: ps.id,
            template_id: q.templateId,
            // Accept any question type as-is (stored as 'uploaded' for uploaded files)
            question_type: 'uploaded',
            // Handle empty question text gracefully
            question_text: q.questionText || '',
            rev: 1,
          })),
        );

        const answersInsert = toInsert.flatMap((ps) =>
          ps.questions.map((q) => ({
            submission_id: ps.id,
            template_id: q.templateId,
            // Handle empty/missing answers gracefully - store empty string, not null
            choice: q.answer || '',
            reasoning: q.answerReasoning || null,
          })),
        );

        const { error: insertSubmissionsError } = await supabase
          .from('submissions')
          .insert(submissionsInsert);
        if (insertSubmissionsError) throw insertSubmissionsError;

        if (questionsInsert.length > 0) {
          const { error: insertQuestionsError } = await supabase
            .from('questions')
            .insert(questionsInsert);
          if (insertQuestionsError) throw insertQuestionsError;
        }

        if (answersInsert.length > 0) {
          const { error: insertAnswersError } = await supabase
            .from('answers')
            .insert(answersInsert);
          if (insertAnswersError) throw insertAnswersError;
        }

        await fetchQueues();

        const queueCount = new Set(toInsert.map((s) => s.queueId)).size;
        return { submissionCount: toInsert.length, queueCount };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to upload submissions';
        toast.error(msg);
        return { submissionCount: 0, queueCount: 0 };
      } finally {
        setIsLoading(false);
      }
    },
    [fetchQueues],
  );

  return { queues, isLoading, uploadSubmissions };
}

export function useQueueDetail(queueId: string | undefined): UseQueueDetailReturn {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [templates, setTemplates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueueDetail = useCallback(async (): Promise<void> => {
    if (!queueId) {
      setSubmissions([]);
      setTemplates([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data: submissionRowsUnknown, error: submissionsError } = await supabase
        .from('submissions')
        .select('id,queue_id,submitted_at,raw_json,attachments')
        .eq('queue_id', queueId)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      const submissionRows = (Array.isArray(submissionRowsUnknown) ? submissionRowsUnknown : []) as unknown[];
      const submissionRowsTyped = submissionRows as Array<SupabaseSubmissionRow>;

      const submissionIds = submissionRowsTyped.map((s) => s.id);
      if (submissionIds.length === 0) {
        setSubmissions([]);
        setTemplates([]);
        return;
      }

      const { data: questionsUnknown, error: questionsError } = await supabase
        .from('questions')
        .select('submission_id,template_id,question_text')
        .in('submission_id', submissionIds);
      if (questionsError) throw questionsError;

      const questions = (Array.isArray(questionsUnknown) ? questionsUnknown : []) as unknown[];
      const questionRows = questions as SupabaseQuestionDetailRow[];

      const { data: answersUnknown, error: answersError } = await supabase
        .from('answers')
        .select('submission_id,template_id,choice,reasoning')
        .in('submission_id', submissionIds);
      if (answersError) throw answersError;

      const answers = (Array.isArray(answersUnknown) ? answersUnknown : []) as unknown[];
      const answerRows = answers as SupabaseAnswerDetailRow[];

      const { data: evalUnknown, error: evalError } = await supabase
        .from('evaluations')
        .select('submission_id')
        .in('submission_id', submissionIds);
      if (evalError) throw evalError;

      const evalRows = (Array.isArray(evalUnknown) ? evalUnknown : []) as unknown[];
      const evaluatedSubmissionIds = new Set<string>(
        evalRows
          .map((r) => (r && typeof r === 'object' ? (r as Record<string, unknown>).submission_id : undefined))
          .filter((v): v is string => typeof v === 'string'),
      );

      const answersByKey = new Map<string, { choice: string; reasoning: string }>();
      for (const a of answerRows) {
        if (!a || typeof a !== 'object') continue;
        const key = `${a.submission_id}:${a.template_id}`;
        answersByKey.set(key, {
          choice: a.choice ?? '',
          reasoning: a.reasoning ?? '',
        });
      }

      const templatesSet = new Set<string>();
      const questionsBySubmission = new Map<string, Submission['questions']>();
      for (const q of questionRows) {
        templatesSet.add(q.template_id);
        const list = questionsBySubmission.get(q.submission_id) ?? [];
        const key = `${q.submission_id}:${q.template_id}`;
        const ans = answersByKey.get(key);
        list.push({
          templateId: q.template_id,
          questionText: q.question_text,
          answer: ans?.choice ?? '',
          answerReasoning: ans?.reasoning ?? '',
        });
        questionsBySubmission.set(q.submission_id, list);
      }

      const nextSubmissions: Submission[] = submissionRowsTyped.map((s) => {
        const qList = questionsBySubmission.get(s.id) ?? [];
        const answerCount = qList.filter((q) => q.answer).length;
        const questionCount = qList.length;
        const status = evaluatedSubmissionIds.has(s.id) ? 'evaluated' : 'pending';

        const subjectMetadata =
          s.raw_json && typeof s.raw_json === 'object'
            ? ((s.raw_json as Record<string, unknown>).subjectMetadata as Record<string, unknown> | undefined)
            : undefined;

        const attachmentsUnknown =
          s && typeof s === 'object' ? (s as Record<string, unknown>).attachments : undefined;
        const attachments =
          Array.isArray(attachmentsUnknown) ? (attachmentsUnknown as SubmissionAttachment[]) : [];

        return {
          id: s.id,
          queueId: s.queue_id,
          questionCount,
          answerCount,
          submittedAt: s.submitted_at,
          status,
          questions: qList,
          subjectMetadata,
          attachments,
        };
      });

      setSubmissions(nextSubmissions);
      setTemplates(Array.from(templatesSet));
    } catch {
      toast.error('Failed to load queue details');
      setSubmissions([]);
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, [queueId]);

  useEffect(() => {
    fetchQueueDetail().catch(() => {
      // handled inside
    });
  }, [fetchQueueDetail]);

  const evalLog: EvalLogEntry[] = useMemo(() => [], []);
  return { submissions, templates, isLoading, evalLog, refetch: fetchQueueDetail };
}
