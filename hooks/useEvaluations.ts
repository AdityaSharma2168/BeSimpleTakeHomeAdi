'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { buildEvaluationPrompt } from '@/lib/promptBuilder';
import type { Evaluation, FilterOption, EvalLogEntry, Provider, Verdict, SubmissionAttachment } from '@/lib/types';

interface EvaluationStats {
  total: number;
  passCount: number;
  failCount: number;
  inconclusiveCount: number;
  uniqueJudges: number;
  avgLatency: number;
  passRate: number;
}

interface EvaluationFilters {
  judges: string[];
  questions: string[];
  verdicts: string[];
  searchQuery: string;
}

type SortField = 'verdict' | 'judge' | 'latency' | 'created';
type SortDirection = 'asc' | 'desc';

interface UseEvaluationsReturn {
  evaluations: Evaluation[];
  isLoading: boolean;
  runEvaluations: (
    params: RunEvaluationsParams,
    onProgress?: (entry: EvalLogEntry, completed: number, total: number) => void,
  ) => Promise<void>;
}

interface UseResultsReturn {
  evaluations: Evaluation[];
  filteredEvaluations: Evaluation[];
  stats: EvaluationStats;
  isLoading: boolean;
  judgeOptions: FilterOption[];
  questionOptions: FilterOption[];
  verdictOptions: FilterOption[];
  groupedEvaluations: Record<string, Evaluation[]>;
  retryFailed: () => Promise<void>;
}

interface RunEvaluationsParams {
  queueId: string;
}

function isVerdict(value: unknown): value is Verdict {
  return value === 'pass' || value === 'fail' || value === 'inconclusive';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useEvaluations(): UseEvaluationsReturn {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runEvaluations = useCallback(
    async (
      params: RunEvaluationsParams,
      onProgress?: (entry: EvalLogEntry, completed: number, total: number) => void,
    ): Promise<void> => {
      const { queueId } = params;
      if (!queueId) return;

      setIsLoading(true);
      try {
        // Read evaluation preferences (saved from Settings page)
        let concurrencyLimit = 5;
        try {
          const { data: prefRowsUnknown, error: prefError } = await supabase
            .from('settings')
            .select('key,value')
            .in('key', ['concurrent_evaluations']);
          if (prefError) throw prefError;

          const prefRows = (Array.isArray(prefRowsUnknown) ? prefRowsUnknown : []) as Array<{
            key: string;
            value: string;
          }>;
          const row = prefRows.find((r) => r.key === 'concurrent_evaluations');
          const parsed = row ? Number.parseInt(row.value, 10) : NaN;
          if (Number.isFinite(parsed) && parsed > 0 && parsed <= 20) concurrencyLimit = parsed;
        } catch {
          // ignore; fall back to defaults
        }

        // 1) Fetch judge assignments for this queue.
        const { data: assignmentRowsUnknown, error: assignmentsError } = await supabase
          .from('judge_assignments')
          .select('judge_id, question_template_id, prompt_config')
          .eq('queue_id', queueId);

        if (assignmentsError) throw assignmentsError;

        const assignmentRows = (Array.isArray(assignmentRowsUnknown) ? assignmentRowsUnknown : []) as Array<{
          judge_id: string;
          question_template_id: string;
          prompt_config: unknown;
        }>;

        if (assignmentRows.length === 0) {
          toast.error('No judge assignments found for this queue');
          return;
        }

        const uniqueJudgeIds = Array.from(new Set(assignmentRows.map((r) => r.judge_id).filter((id) => typeof id === 'string')));

        const { data: judgesUnknown, error: judgesError } = await supabase
          .from('judges')
          .select('id,name,system_prompt,model_name,provider,active')
          .in('id', uniqueJudgeIds);
        if (judgesError) throw judgesError;

        const judgesRows = (Array.isArray(judgesUnknown) ? judgesUnknown : []) as Array<{
          id: string;
          name: string;
          system_prompt: string;
          model_name: string;
          provider: Provider;
          active: boolean;
        }>;

        const judgeById = new Map<string, (typeof judgesRows)[number]>();
        for (const j of judgesRows) judgeById.set(j.id, j);

        // 2) Fetch submissions for this queue.
        const { data: submissionsUnknown, error: submissionsError } = await supabase
          .from('submissions')
          .select('id,queue_id,submitted_at,raw_json,attachments')
          .eq('queue_id', queueId);
        if (submissionsError) throw submissionsError;

        const submissionRows = (Array.isArray(submissionsUnknown) ? submissionsUnknown : []) as Array<{
          id: string;
          queue_id: string;
          submitted_at: string;
          raw_json?: unknown;
          attachments?: unknown;
        }>;

        const submissionIds = submissionRows.map((s) => s.id);
        if (submissionIds.length === 0) {
          toast.error('No submissions found for this queue');
          return;
        }

        const subjectMetadataBySubmission = new Map<string, Record<string, unknown> | undefined>();
        for (const s of submissionRows) {
          const meta =
            s.raw_json && typeof s.raw_json === 'object'
              ? ((s.raw_json as Record<string, unknown>).subjectMetadata as Record<string, unknown> | undefined)
              : undefined;
          subjectMetadataBySubmission.set(s.id, meta);
        }

        const attachmentsBySubmission = new Map<string, SubmissionAttachment[]>();
        for (const s of submissionRows) {
          const a = s.attachments;
          const list = Array.isArray(a) ? (a as SubmissionAttachment[]) : [];
          attachmentsBySubmission.set(s.id, list);
        }

        // 3) Fetch questions + answers for all submissions.
        const { data: questionsUnknown, error: questionsError } = await supabase
          .from('questions')
          .select('submission_id,template_id,question_type,question_text')
          .in('submission_id', submissionIds);
        if (questionsError) throw questionsError;

        const questionRows = (Array.isArray(questionsUnknown) ? questionsUnknown : []) as Array<{
          submission_id: string;
          template_id: string;
          question_type: string;
          question_text: string;
        }>;

        const { data: answersUnknown, error: answersError } = await supabase
          .from('answers')
          .select('submission_id,template_id,choice,reasoning')
          .in('submission_id', submissionIds);
        if (answersError) throw answersError;

        const answerRows = (Array.isArray(answersUnknown) ? answersUnknown : []) as Array<{
          submission_id: string;
          template_id: string;
          choice: string | null;
          reasoning: string | null;
        }>;

        const answerByKey = new Map<string, { choice: string; reasoning: string }>();
        for (const a of answerRows) {
          const key = `${a.submission_id}:${a.template_id}`;
          answerByKey.set(key, {
            choice: a.choice ?? '',
            reasoning: a.reasoning ?? '',
          });
        }

        const questionsBySubmission = new Map<
          string,
          Array<{
            templateId: string;
            questionText: string;
            questionType: string;
          }>
        >();
        for (const q of questionRows) {
          const list = questionsBySubmission.get(q.submission_id) ?? [];
          list.push({
            templateId: q.template_id,
            questionText: q.question_text,
            questionType: q.question_type,
          });
          questionsBySubmission.set(q.submission_id, list);
        }

        type PromptConfig = {
          includeQuestionText: boolean;
          includeAnswerChoice: boolean;
          includeAnswerReasoning: boolean;
          includeQuestionType: boolean;
          includeSubmissionMetadata: boolean;
        };

        const boolOrDefault = (v: unknown, d: boolean): boolean => {
          if (v === true) return true;
          if (v === false) return false;
          return d;
        };

        const parsePromptConfig = (promptConfigUnknown: unknown): PromptConfig => {
          const defaults: PromptConfig = {
            includeQuestionText: true,
            includeAnswerChoice: true,
            includeAnswerReasoning: true,
            includeQuestionType: false,
            includeSubmissionMetadata: false,
          };

          if (!promptConfigUnknown || typeof promptConfigUnknown !== 'object') return defaults;
          const pc = promptConfigUnknown as Record<string, unknown>;

          return {
            includeQuestionText: boolOrDefault(pc.include_question_text, defaults.includeQuestionText),
            includeAnswerChoice: boolOrDefault(pc.include_answer_choice, defaults.includeAnswerChoice),
            includeAnswerReasoning: boolOrDefault(pc.include_answer_reasoning, defaults.includeAnswerReasoning),
            includeQuestionType: boolOrDefault(pc.include_question_type, defaults.includeQuestionType),
            includeSubmissionMetadata: boolOrDefault(pc.include_metadata, defaults.includeSubmissionMetadata),
          };
        };

        type EvaluationTask = {
          submissionId: string;
          templateId: string;
          questionText: string;
          questionType: string;
          answerChoice: string;
          answerReasoning: string;
          subjectMetadata?: Record<string, unknown>;
          attachments: SubmissionAttachment[];
          judgeId: string;
          judgeName: string;
          judgeSystemPrompt: string;
          judgeModelName: string;
          judgeProvider: Provider;
          promptConfig: PromptConfig;
        };

        // Build all (submission x question x judgeAssignment) tasks.
        const tasks: EvaluationTask[] = [];
        for (const sub of submissionRows) {
          const questions = questionsBySubmission.get(sub.id) ?? [];
          for (const q of questions) {
            const relevantAssignments = assignmentRows.filter(
              (ar) => ar.question_template_id === q.templateId,
            );

            for (const ar of relevantAssignments) {
              const judge = judgeById.get(ar.judge_id);
              if (!judge) continue;
              if (!judge.active) continue;

              const key = `${sub.id}:${q.templateId}`;
              const ans = answerByKey.get(key) ?? { choice: '', reasoning: '' };

              tasks.push({
                submissionId: sub.id,
                templateId: q.templateId,
                questionText: q.questionText,
                questionType: q.questionType,
                answerChoice: ans.choice,
                answerReasoning: ans.reasoning,
                subjectMetadata: subjectMetadataBySubmission.get(sub.id),
                attachments: attachmentsBySubmission.get(sub.id) ?? [],
                judgeId: judge.id,
                judgeName: judge.name,
                judgeSystemPrompt: judge.system_prompt,
                judgeModelName: judge.model_name,
                judgeProvider: judge.provider,
                promptConfig: parsePromptConfig(ar.prompt_config),
              });
            }
          }
        }

        if (tasks.length === 0) {
          toast.error('No evaluation tasks found for this queue');
          return;
        }

        const total = tasks.length;
        let completed = 0;
        let cursor = 0;

        const limit = Math.min(concurrencyLimit, 20);

        const evaluateSingleTask = async (task: EvaluationTask): Promise<EvalLogEntry> => {
          const maxRetries = 3;
          const backoffsMs = [2000, 4000, 8000];

          let lastLatencyMs = 0;
          let verdict: Verdict = 'inconclusive';
          let reasoning = 'Evaluation failed';
          let tokensUsed = 0;
          let errorText = '';

          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const start = Date.now();
            try {
              const prompt = buildEvaluationPrompt(
                { questionText: task.questionText, questionType: task.questionType },
                { choice: task.answerChoice, reasoning: task.answerReasoning },
                { subjectMetadata: task.subjectMetadata },
                {
                  includeQuestionText: task.promptConfig.includeQuestionText,
                  includeAnswerChoice: task.promptConfig.includeAnswerChoice,
                  includeAnswerReasoning: task.promptConfig.includeAnswerReasoning,
                  includeQuestionType: task.promptConfig.includeQuestionType,
                  includeSubmissionMetadata: task.promptConfig.includeSubmissionMetadata,
                },
              );

              const res = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  systemPrompt: task.judgeSystemPrompt,
                  userPrompt: prompt,
                  model: task.judgeModelName,
                  provider: task.judgeProvider,
                  attachments: task.attachments,
                }),
              });

              lastLatencyMs = Date.now() - start;

              if (res.status === 429) {
                errorText = 'Rate limit exceeded';
                if (attempt < maxRetries) {
                  await sleep(backoffsMs[attempt] ?? 8000);
                  continue;
                }
              }

              if (!res.ok) {
                let msg = `HTTP ${res.status}`;
                try {
                  const errBody: unknown = await res.json();
                  if (errBody && typeof errBody === 'object' && 'error' in errBody) {
                    const v = (errBody as Record<string, unknown>).error;
                    msg = typeof v === 'string' ? v : msg;
                  }
                } catch {
                  // ignore parse errors
                }
                errorText = msg;
                break;
              }

              const jsonUnknown: unknown = await res.json();
              const json = jsonUnknown as Record<string, unknown>;

              const v = json['verdict'];
              if (isVerdict(v)) verdict = v;
              const r = json['reasoning'];
              if (typeof r === 'string' && r.trim().length > 0) reasoning = r;

              const t = json['tokensUsed'];
              if (typeof t === 'number' && Number.isFinite(t)) tokensUsed = t;

              errorText = '';
              break;
            } catch (e) {
              lastLatencyMs = Date.now() - start;
              errorText = e instanceof Error ? e.message : 'Evaluation error';
              break;
            }
          }

          if (errorText) {
            reasoning = errorText;
          }

          // Insert result into Supabase (success or failure).
          const { error: insertError } = await supabase.from('evaluations').insert({
            judge_id: task.judgeId,
            submission_id: task.submissionId,
            question_template_id: task.templateId,
            question_text: task.questionText,
            verdict,
            reasoning,
            model_used: task.judgeModelName,
            tokens_used: tokensUsed,
            latency_ms: lastLatencyMs,
            error: errorText ? errorText : null,
          });

          if (insertError) {
            toast.error('Failed to save evaluation result');
          }

          return {
            submissionId: task.submissionId,
            templateId: task.templateId,
            judgeName: task.judgeName,
            verdict,
            latency: lastLatencyMs,
          };
        };

        const worker = async (): Promise<void> => {
          while (true) {
            const idx = cursor;
            cursor += 1;
            if (idx >= tasks.length) return;
            const task = tasks[idx];
            const entry = await evaluateSingleTask(task);
            completed += 1;
            onProgress?.(entry, completed, total);
          }
        };

        const workerCount = Math.min(limit, tasks.length);
        const workers = Array.from({ length: workerCount }).map(() => worker());
        await Promise.all(workers);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to run evaluations';
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    evaluations,
    isLoading,
    runEvaluations,
  };
}

export function useResults(
  filters: EvaluationFilters,
  sortBy: SortField,
  sortDir: SortDirection
): UseResultsReturn {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvaluations = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { data: evalUnknown, error: evalError } = await supabase
        .from('evaluations')
        .select(
          'id,submission_id,question_template_id,question_text,judge_id,verdict,reasoning,tokens_used,latency_ms,created_at',
        );
      if (evalError) throw evalError;

      const evalRows = (Array.isArray(evalUnknown) ? evalUnknown : []) as Array<{
        id: string;
        submission_id: string;
        question_template_id: string;
        question_text: string;
        judge_id: string;
        verdict: string;
        reasoning: string;
        tokens_used: number | null;
        latency_ms: number | null;
        created_at: string;
      }>;

      const judgeIds = Array.from(
        new Set(evalRows.map((e) => e.judge_id).filter((id) => typeof id === 'string')),
      );
      const templateIds = Array.from(
        new Set(evalRows.map((e) => e.question_template_id).filter((id) => typeof id === 'string')),
      );

      const { data: judgesUnknown, error: judgesError } = await supabase
        .from('judges')
        .select('id,name,model_name,provider')
        .in('id', judgeIds);
      if (judgesError) throw judgesError;

      const judgesRows = (Array.isArray(judgesUnknown) ? judgesUnknown : []) as Array<{
        id: string;
        name: string;
        model_name: string;
        provider: Provider;
      }>;

      const judgeById = new Map<string, typeof judgesRows[number]>();
      for (const j of judgesRows) judgeById.set(j.id, j);

      const { data: questionsUnknown, error: questionsError } = await supabase
        .from('questions')
        .select('template_id,question_text')
        .in('template_id', templateIds);
      if (questionsError) throw questionsError;

      const questionRows = (Array.isArray(questionsUnknown) ? questionsUnknown : []) as Array<{
        template_id: string;
        question_text: string;
      }>;

      const questionTextByTemplateId = new Map<string, string>();
      for (const q of questionRows) {
        if (!questionTextByTemplateId.has(q.template_id)) {
          questionTextByTemplateId.set(q.template_id, q.question_text);
        }
      }

      const nextEvaluations: Evaluation[] = evalRows.map((e) => {
        const judge = judgeById.get(e.judge_id);
        const resolvedVerdict: Verdict = isVerdict(e.verdict) ? e.verdict : 'inconclusive';

        return {
          id: e.id,
          submission_id: e.submission_id,
          question_template_id: e.question_template_id,
          question_text: questionTextByTemplateId.get(e.question_template_id) ?? e.question_text,
          judge_id: e.judge_id,
          judge_name: judge?.name ?? 'Unknown judge',
          judge_model: judge?.model_name ?? '',
          judge_provider: judge?.provider ?? 'openai',
          verdict: resolvedVerdict,
          reasoning: e.reasoning ?? '',
          tokens_used: typeof e.tokens_used === 'number' ? e.tokens_used : 0,
          latency_ms: typeof e.latency_ms === 'number' ? e.latency_ms : 0,
          created_at: e.created_at,
        };
      });

      setEvaluations(nextEvaluations);
    } catch {
      toast.error('Failed to load evaluations');
      setEvaluations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvaluations().catch(() => {
      // handled inside
    });
  }, [fetchEvaluations]);

  const retryFailed = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Only retry evaluations that currently failed.
      const { data: failedUnknown, error: failedError } = await supabase
        .from('evaluations')
        .select(
          'id,judge_id,submission_id,question_template_id,question_text,verdict',
        )
        .eq('verdict', 'fail');

      if (failedError) throw failedError;

      const failedRows = (Array.isArray(failedUnknown) ? failedUnknown : []) as Array<{
        id: string;
        judge_id: string;
        submission_id: string;
        question_template_id: string;
        question_text: string;
      }>;

      if (failedRows.length === 0) {
        toast.success('No failed evaluations to retry.');
        return;
      }

      const submissionIds = Array.from(
        new Set(failedRows.map((r) => r.submission_id).filter((id) => typeof id === 'string')),
      );

      const { data: submissionsUnknown, error: subsError } = await supabase
        .from('submissions')
        .select('id,queue_id')
        .in('id', submissionIds);

      if (subsError) throw subsError;

      const submissionsRows = (Array.isArray(submissionsUnknown) ? submissionsUnknown : []) as Array<{
        id: string;
        queue_id: string;
      }>;

      const submissionToQueue = new Map<string, string>();
      for (const s of submissionsRows) submissionToQueue.set(s.id, s.queue_id);

      const queueIds = Array.from(
        new Set(
          failedRows
            .map((r) => submissionToQueue.get(r.submission_id))
            .filter((q): q is string => typeof q === 'string'),
        ),
      );

      for (const queueId of queueIds) {
        const groupRows = failedRows.filter((r) => submissionToQueue.get(r.submission_id) === queueId);
        if (groupRows.length === 0) continue;

        const groupSubmissionIds = Array.from(
          new Set(groupRows.map((r) => r.submission_id)),
        );
        const groupJudgeIds = Array.from(new Set(groupRows.map((r) => r.judge_id)));
        const groupTemplateIds = Array.from(new Set(groupRows.map((r) => r.question_template_id)));

        const { data: judgesUnknown, error: judgesError } = await supabase
          .from('judges')
          .select('id,name,system_prompt,model_name,provider,active')
          .in('id', groupJudgeIds);
        if (judgesError) throw judgesError;
        const judgesRows = (Array.isArray(judgesUnknown) ? judgesUnknown : []) as Array<{
          id: string;
          name: string;
          system_prompt: string;
          model_name: string;
          provider: Provider;
          active: boolean;
        }>;
        const judgeById = new Map<string, typeof judgesRows[number]>();
        for (const j of judgesRows) judgeById.set(j.id, j);

        const { data: questionsUnknown, error: questionsError } = await supabase
          .from('questions')
          .select('submission_id,template_id,question_type,question_text')
          .in('submission_id', groupSubmissionIds)
          .in('template_id', groupTemplateIds);
        if (questionsError) throw questionsError;
        const questionsRows = (Array.isArray(questionsUnknown) ? questionsUnknown : []) as Array<{
          submission_id: string;
          template_id: string;
          question_type: string;
          question_text: string;
        }>;
        const questionByKey = new Map<string, { questionText: string; questionType: string }>();
        for (const q of questionsRows) {
          questionByKey.set(`${q.submission_id}:${q.template_id}`, {
            questionText: q.question_text,
            questionType: q.question_type,
          });
        }

        const { data: answersUnknown, error: answersError } = await supabase
          .from('answers')
          .select('submission_id,template_id,choice,reasoning')
          .in('submission_id', groupSubmissionIds)
          .in('template_id', groupTemplateIds);
        if (answersError) throw answersError;
        const answersRows = (Array.isArray(answersUnknown) ? answersUnknown : []) as Array<{
          submission_id: string;
          template_id: string;
          choice: string | null;
          reasoning: string | null;
        }>;
        const answerByKey = new Map<string, { choice: string; reasoning: string }>();
        for (const a of answersRows) {
          answerByKey.set(`${a.submission_id}:${a.template_id}`, {
            choice: a.choice ?? '',
            reasoning: a.reasoning ?? '',
          });
        }

        const { data: assignsUnknown, error: assignsError } = await supabase
          .from('judge_assignments')
          .select('judge_id,question_template_id,prompt_config')
          .eq('queue_id', queueId)
          .in('judge_id', groupJudgeIds)
          .in('question_template_id', groupTemplateIds);
        if (assignsError) throw assignsError;

        const assignsRows = (Array.isArray(assignsUnknown) ? assignsUnknown : []) as Array<{
          judge_id: string;
          question_template_id: string;
          prompt_config: unknown;
        }>;

        const promptConfigByKey = new Map<
          string,
          {
            includeQuestionText: boolean;
            includeAnswerChoice: boolean;
            includeAnswerReasoning: boolean;
            includeQuestionType: boolean;
            includeSubmissionMetadata: boolean;
          }
        >();

        const boolOrFalse = (v: unknown): boolean => v === true;
        for (const a of assignsRows) {
          const pc = a.prompt_config;
          const cfg = {
            includeQuestionText: pc && typeof pc === 'object' ? boolOrFalse((pc as Record<string, unknown>).include_question_text) : true,
            includeAnswerChoice: pc && typeof pc === 'object' ? boolOrFalse((pc as Record<string, unknown>).include_answer_choice) : true,
            includeAnswerReasoning: pc && typeof pc === 'object' ? boolOrFalse((pc as Record<string, unknown>).include_answer_reasoning) : true,
            includeQuestionType: pc && typeof pc === 'object' ? boolOrFalse((pc as Record<string, unknown>).include_question_type) : false,
            includeSubmissionMetadata: pc && typeof pc === 'object' ? boolOrFalse((pc as Record<string, unknown>).include_metadata) : false,
          };
          promptConfigByKey.set(
            `${queueId}:${a.judge_id}:${a.question_template_id}`,
            cfg,
          );
        }

        type FailedTask = {
          evaluationId: string;
          judgeId: string;
          submissionId: string;
          templateId: string;
        };

        const tasks: FailedTask[] = groupRows.map((r) => ({
          evaluationId: r.id,
          judgeId: r.judge_id,
          submissionId: r.submission_id,
          templateId: r.question_template_id,
        }));

        let completed = 0;
        const total = tasks.length;
        const concurrency = 5;
        let cursor = 0;

        const evaluateTask = async (task: FailedTask): Promise<void> => {
          const judge = judgeById.get(task.judgeId);
          const question = questionByKey.get(`${task.submissionId}:${task.templateId}`);
          const answer = answerByKey.get(`${task.submissionId}:${task.templateId}`);
          const promptCfg = promptConfigByKey.get(`${queueId}:${task.judgeId}:${task.templateId}`);

          if (!judge || !question || !answer || !promptCfg) return;

          const maxRetries = 3;
          const backoffsMs = [2000, 4000, 8000];

          let lastLatencyMs = 0;
          let resultVerdict: Verdict = 'inconclusive';
          let resultReasoning = 'Retry failed';
          let tokensUsed = 0;
          let errorText: string | null = null;

          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
              const start = Date.now();
              const userPrompt = buildEvaluationPrompt(
                { questionText: question.questionText, questionType: question.questionType },
                { choice: answer.choice, reasoning: answer.reasoning },
                undefined,
                promptCfg,
              );

              const res = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  systemPrompt: judge.system_prompt,
                  userPrompt,
                  model: judge.model_name,
                  provider: judge.provider,
                }),
              });

              lastLatencyMs = Date.now() - start;

              if (res.status === 429) {
                errorText = 'Rate limit exceeded';
                if (attempt < maxRetries) {
                  await sleep(backoffsMs[attempt] ?? 8000);
                  continue;
                }
              }

              if (!res.ok) {
                errorText = `HTTP ${res.status}`;
                break;
              }

              const jsonUnknown: unknown = await res.json();
              const json = jsonUnknown as {
                verdict: Verdict;
                reasoning: string;
                tokensUsed?: number;
              };

              if (isVerdict(json.verdict)) resultVerdict = json.verdict;
              resultReasoning = typeof json.reasoning === 'string' ? json.reasoning : resultReasoning;
              if (typeof json.tokensUsed === 'number' && Number.isFinite(json.tokensUsed)) tokensUsed = json.tokensUsed;
              errorText = null;
              break;
            } catch (e) {
              errorText = e instanceof Error ? e.message : 'Evaluation error';
              break;
            }
          }

          if (errorText) {
            resultVerdict = 'inconclusive';
            resultReasoning = errorText;
          }

          const { error: updateError } = await supabase
            .from('evaluations')
            .update({
              verdict: resultVerdict,
              reasoning: resultReasoning,
              tokens_used: tokensUsed,
              latency_ms: lastLatencyMs,
              model_used: judge.model_name,
              error: errorText,
            })
            .eq('id', task.evaluationId);

          if (updateError) {
            toast.error('Failed to update retry result');
          }
        };

        const worker = async (): Promise<void> => {
          while (true) {
            const idx = cursor;
            cursor += 1;
            if (idx >= tasks.length) return;
            await evaluateTask(tasks[idx]);
            completed += 1;
            // For now we don't stream progress in the hook; the UI already has a button.
          }
        };

        const workers = Array.from({ length: Math.min(concurrency, tasks.length) }).map(() =>
          worker(),
        );
        await Promise.all(workers);
      }

      toast.success('Retry completed');
      await fetchEvaluations();
    } catch {
      toast.error('Failed to retry failed evaluations');
      await fetchEvaluations();
    } finally {
      setIsLoading(false);
    }
  }, [fetchEvaluations]);

  // Stats calculations
  const stats = useMemo((): EvaluationStats => {
    if (evaluations.length === 0) {
      return {
        total: 0,
        passCount: 0,
        failCount: 0,
        inconclusiveCount: 0,
        uniqueJudges: 0,
        avgLatency: 0,
        passRate: 0,
      };
    }

    const total = evaluations.length;
    const passCount = evaluations.filter((e) => e.verdict === 'pass').length;
    const failCount = evaluations.filter((e) => e.verdict === 'fail').length;
    const inconclusiveCount = evaluations.filter((e) => e.verdict === 'inconclusive').length;
    const uniqueJudges = new Set(evaluations.map((e) => e.judge_id)).size;
    const avgLatency = Math.round(
      evaluations.reduce((acc, e) => acc + e.latency_ms, 0) / total
    );
    const passRate = Math.round((passCount / total) * 100);

    return { total, passCount, failCount, inconclusiveCount, uniqueJudges, avgLatency, passRate };
  }, [evaluations]);

  // Filter options
  const judgeOptions: FilterOption[] = useMemo(() => {
    const judgeMap = new Map<string, { name: string; provider: string }>();
    evaluations.forEach((e) => {
      if (!judgeMap.has(e.judge_id)) {
        judgeMap.set(e.judge_id, { name: e.judge_name, provider: e.judge_provider });
      }
    });
    return Array.from(judgeMap.entries()).map(([id, { name, provider }]) => ({
      value: id,
      label: name,
      dotColor: provider === 'openai' ? 'bg-emerald-500' : provider === 'anthropic' ? 'bg-violet-500' : 'bg-blue-500',
    }));
  }, [evaluations]);

  const questionOptions: FilterOption[] = useMemo(() => {
    const questionMap = new Map<string, string>();
    evaluations.forEach((e) => {
      if (!questionMap.has(e.question_template_id)) {
        questionMap.set(e.question_template_id, e.question_text);
      }
    });
    return Array.from(questionMap.entries()).map(([id, text]) => ({
      value: id,
      label: `${id}: ${text.substring(0, 30)}...`,
    }));
  }, [evaluations]);

  const verdictOptions: FilterOption[] = [
    { value: 'pass', label: 'Pass', dotColor: 'bg-emerald-500' },
    { value: 'fail', label: 'Fail', dotColor: 'bg-rose-500' },
    { value: 'inconclusive', label: 'Inconclusive', dotColor: 'bg-slate-400' },
  ];

  // Filtered and sorted evaluations
  const filteredEvaluations = useMemo(() => {
    let result = [...evaluations];

    if (filters.judges.length > 0) {
      result = result.filter((e) => filters.judges.includes(e.judge_id));
    }
    if (filters.questions.length > 0) {
      result = result.filter((e) => filters.questions.includes(e.question_template_id));
    }
    if (filters.verdicts.length > 0) {
      result = result.filter((e) => filters.verdicts.includes(e.verdict));
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter((e) => e.reasoning.toLowerCase().includes(query));
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'verdict':
          cmp = a.verdict.localeCompare(b.verdict);
          break;
        case 'judge':
          cmp = a.judge_name.localeCompare(b.judge_name);
          break;
        case 'latency':
          cmp = a.latency_ms - b.latency_ms;
          break;
        case 'created':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [evaluations, filters, sortBy, sortDir]);

  // Group evaluations by submission+question for comparison
  const groupedEvaluations = useMemo(() => {
    const groups: Record<string, Evaluation[]> = {};
    evaluations.forEach((e) => {
      const key = `${e.submission_id}-${e.question_template_id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }, [evaluations]);

  return {
    evaluations,
    filteredEvaluations,
    stats,
    isLoading,
    judgeOptions,
    questionOptions,
    verdictOptions,
    groupedEvaluations,
    retryFailed,
  };
}
