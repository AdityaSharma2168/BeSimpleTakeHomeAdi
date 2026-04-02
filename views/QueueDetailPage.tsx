'use client';

import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, ChevronDown, ChevronRight, Check, X, AlertTriangle, Paperclip, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { VerdictBadge } from '@/components/VerdictBadge';
import { EmptyState } from '@/components/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { JudgeAssignmentDrawer } from '@/components/JudgeAssignmentDrawer';
import { RunEvaluationModal } from '@/components/RunEvaluationModal';
import { useQueueDetail } from '@/hooks/useSubmissions';
import { useJudges } from '@/hooks/useJudges';
import { useEvaluations } from '@/hooks/useEvaluations';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Submission, EvalLogEntry, SubmissionAttachment } from '@/lib/types';

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

interface SubmissionRowProps {
  submission: Submission;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdated: () => void;
}

function SubmissionRow({ submission, isExpanded, onToggle, onUpdated }: SubmissionRowProps) {
  const attachmentCount = submission.attachments?.length ?? 0;
  const fileInputRef = useState<{ current: HTMLInputElement | null }>(() => ({ current: null }))[0];

  const toSafeStorageName = useCallback((name: string): string => {
    return name
      .normalize('NFKD')
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_');
  }, []);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const bucket = 'attachments';
      try {
        const existing = submission.attachments ?? [];
        const next: SubmissionAttachment[] = [...existing];

        for (const f of files) {
          const extOk =
            f.name.toLowerCase().endsWith('.png') ||
            f.name.toLowerCase().endsWith('.jpg') ||
            f.name.toLowerCase().endsWith('.jpeg') ||
            f.name.toLowerCase().endsWith('.webp') ||
            f.name.toLowerCase().endsWith('.pdf');
          if (!extOk) continue;

          const safeName = toSafeStorageName(f.name);
          const storagePath = `${submission.id}/${Date.now()}_${safeName}`;
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(storagePath, f, {
              upsert: false,
              contentType: f.type || 'application/octet-stream',
            });
          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
          next.push({
            fileName: f.name,
            fileUrl: data.publicUrl,
            fileType: f.type || (safeName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/*'),
            fileSize: f.size,
          });
        }

        const { error: updateError } = await supabase
          .from('submissions')
          .update({ attachments: next })
          .eq('id', submission.id);
        if (updateError) throw updateError;

        toast.success('Attachments updated');
        onUpdated();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to upload attachments';
        toast.error(msg);
      }
    },
    [onUpdated, submission.attachments, submission.id],
  );

  const removeAttachment = useCallback(
    async (a: SubmissionAttachment) => {
      const bucket = 'attachments';
      try {
        const pathPrefix = `/storage/v1/object/public/${bucket}/`;
        const idx = a.fileUrl.indexOf(pathPrefix);
        if (idx !== -1) {
          const storagePath = a.fileUrl.slice(idx + pathPrefix.length);
          await supabase.storage.from(bucket).remove([storagePath]);
        }

        const next = (submission.attachments ?? []).filter((x) => x.fileUrl !== a.fileUrl);
        const { error: updateError } = await supabase
          .from('submissions')
          .update({ attachments: next })
          .eq('id', submission.id);
        if (updateError) throw updateError;

        toast.success('Attachment removed');
        onUpdated();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to remove attachment';
        toast.error(msg);
      }
    },
    [onUpdated, submission.attachments, submission.id],
  );

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
        onClick={onToggle}
      >
        <TableCell className="w-8">
          {isExpanded ? (
            <ChevronDown className="size-4 text-slate-400" />
          ) : (
            <ChevronRight className="size-4 text-slate-400" />
          )}
        </TableCell>
        <TableCell className="font-mono text-xs">
          <div className="flex items-center gap-2">
            <span>{submission.id}</span>
            {attachmentCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Paperclip className="size-3" />
                {attachmentCount}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {submission.questionCount}
          </span>
        </TableCell>
        <TableCell className="text-sm">{submission.answerCount}</TableCell>
        <TableCell className="text-sm text-slate-500">
          {formatRelativeDate(submission.submittedAt)}
        </TableCell>
        <TableCell>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
              submission.status === 'evaluated'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                submission.status === 'evaluated' ? 'bg-emerald-500' : 'bg-slate-400'
              )}
            />
            {submission.status === 'evaluated' ? 'Evaluated' : 'Pending'}
          </span>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-slate-50 dark:bg-slate-900/50">
          <TableCell colSpan={6} className="p-0">
            <div className="p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Attachments
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={(el) => {
                      fileInputRef.current = el;
                    }}
                    type="file"
                    multiple
                    accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      void uploadFiles(files);
                      e.currentTarget.value = '';
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Attach Files
                  </Button>
                </div>
              </div>

              {attachmentCount > 0 ? (
                <div className="mb-4 grid gap-2 sm:grid-cols-2">
                  {(submission.attachments ?? []).map((a) => {
                    const isPdf =
                      a.fileType === 'application/pdf' ||
                      a.fileName.toLowerCase().endsWith('.pdf');
                    const isImage = !isPdf;

                    return (
                      <div
                        key={`${a.fileUrl}`}
                        className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex size-10 items-center justify-center overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                          {isImage ? (
                            <img
                              src={a.fileUrl}
                              alt={a.fileName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileText className="size-5 text-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {a.fileName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {Math.round(a.fileSize / 1024)} KB
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(a.fileUrl, '_blank', 'noopener,noreferrer');
                            }}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void removeAttachment(a);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                  No attachments
                </p>
              )}

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="pb-2 text-left text-xs font-medium text-slate-500">
                      Template ID
                    </th>
                    <th className="pb-2 text-left text-xs font-medium text-slate-500">
                      Question
                    </th>
                    <th className="pb-2 text-left text-xs font-medium text-slate-500">
                      Answer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {submission.questions.map((q, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="py-2 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {q.templateId}
                      </td>
                      <td className="py-2 text-slate-700 dark:text-slate-300">
                        {q.questionText}
                      </td>
                      <td className="py-2 text-slate-700 dark:text-slate-300">
                        {q.answer}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function SubmissionRowSkeleton() {
  return (
    <TableRow>
      <TableCell className="w-8"><Skeleton className="h-4 w-4" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-5 w-6" /></TableCell>
      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
    </TableRow>
  );
}

function SubmissionsTableSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8" />
            <TableHead className="text-xs">Submission ID</TableHead>
            <TableHead className="text-xs">Questions</TableHead>
            <TableHead className="text-xs">Answers</TableHead>
            <TableHead className="text-xs">Submitted At</TableHead>
            <TableHead className="text-xs">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <SubmissionRowSkeleton key={i} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface RunProgressPanelProps {
  isRunning: boolean;
  completedCount: number;
  totalCount: number;
  passCount: number;
  failCount: number;
  inconclusiveCount: number;
  logs: EvalLogEntry[];
  onComplete: () => void;
}

function RunProgressPanel({
  isRunning,
  completedCount,
  totalCount,
  passCount,
  failCount,
  inconclusiveCount,
  logs,
  onComplete,
}: RunProgressPanelProps) {
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isComplete = completedCount >= totalCount;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          {isComplete ? 'Run Complete' : 'Running Evaluations'}
        </h3>
        <span className="text-sm text-slate-500">
          {completedCount} / {totalCount} completed
        </span>
      </div>

      <Progress value={progress} className="mb-4 h-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-indigo-600" />

      <div className="mb-4 flex gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          <Check className="size-3.5" />
          {passCount} pass
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-sm font-medium text-rose-700 dark:bg-rose-950 dark:text-rose-400">
          <X className="size-3.5" />
          {failCount} fail
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <AlertTriangle className="size-3.5" />
          {inconclusiveCount} inconclusive
        </span>
      </div>

      <div className="mb-4 max-h-48 overflow-y-auto rounded-lg bg-slate-50 p-3 font-mono text-xs dark:bg-slate-950">
        {logs.map((log, idx) => (
          <div
            key={idx}
            className={cn(
              'py-1',
              log.verdict === 'fail' && 'bg-rose-50 dark:bg-rose-950/30'
            )}
          >
            <span className="text-slate-500">{log.submissionId}</span>
            <span className="mx-1 text-slate-400">/</span>
            <span className="text-slate-500">{log.templateId}</span>
            <span className="mx-1 text-slate-400">/</span>
            <span className="text-slate-700 dark:text-slate-300">{log.judgeName}</span>
            <span className="mx-2 text-slate-400">{'->'}</span>
            <VerdictBadge verdict={log.verdict} />
            <span className="ml-2 text-slate-400">({(log.latency / 1000).toFixed(1)}s)</span>
          </div>
        ))}
      </div>

      {isComplete && (
        <div className="flex justify-end">
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Link to="/results">View Results</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export function QueueDetailPage() {
  const { queueId } = useParams<{ queueId: string }>();
  const { submissions, templates, isLoading, refetch } = useQueueDetail(queueId);
  const { judges } = useJudges();
  const { runEvaluations } = useEvaluations();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runLogs, setRunLogs] = useState<EvalLogEntry[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleStartRun = useCallback(() => {
    setIsRunModalOpen(false);
    setIsRunning(true);
    setRunLogs([]);
    setTotalTasks(0);

    void runEvaluations(
      { queueId: queueId ?? '' },
      (entry, completed, total) => {
        setTotalTasks(total);
        setRunLogs((prev) => [...prev, entry]);
      },
    ).catch(() => {
      // Errors are handled in the hook via toasts.
      setIsRunning(false);
    });
  }, [queueId, runEvaluations]);

  const passCount = runLogs.filter((l) => l?.verdict === 'pass').length;
  const failCount = runLogs.filter((l) => l?.verdict === 'fail').length;
  const inconclusiveCount = runLogs.filter((l) => l?.verdict === 'inconclusive').length;

  const showEmpty = !isLoading && submissions.length === 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-150">
      <PageHeader
        title={`Queue: ${queueId}`}
        breadcrumbs={[
          { label: 'Submissions', href: '/submissions' },
          { label: queueId || '' },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={() => setIsDrawerOpen(true)}>
              Assign Judges
            </Button>
            <Button
              onClick={() => setIsRunModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Play className="size-4" />
              Run AI Judges
            </Button>
          </>
        }
      />

      {isRunning && runLogs.length > 0 && (
        <div className="mb-6">
          <RunProgressPanel
            isRunning={isRunning}
            completedCount={runLogs.length}
            totalCount={totalTasks}
            passCount={passCount}
            failCount={failCount}
            inconclusiveCount={inconclusiveCount}
            logs={runLogs}
            onComplete={() => setIsRunning(false)}
          />
        </div>
      )}

      {isLoading ? (
        <SubmissionsTableSkeleton />
      ) : showEmpty ? (
        <EmptyState
          icon={Play}
          title="No submissions in this queue"
          description="This queue has no submissions yet"
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-8" />
                <TableHead className="text-xs">Submission ID</TableHead>
                <TableHead className="text-xs">Questions</TableHead>
                <TableHead className="text-xs">Answers</TableHead>
                <TableHead className="text-xs">Submitted At</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <SubmissionRow
                  key={submission.id}
                  submission={submission}
                  isExpanded={expandedIds.has(submission.id)}
                  onToggle={() => toggleExpanded(submission.id)}
                  onUpdated={() => {
                    void refetch();
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

<JudgeAssignmentDrawer
  open={isDrawerOpen}
  onOpenChange={setIsDrawerOpen}
  templates={templates}
  judges={judges}
  />

      <RunEvaluationModal
        open={isRunModalOpen}
        onOpenChange={setIsRunModalOpen}
        onStart={handleStartRun}
        evaluationCount={16}
        judgeCount={3}
        submissionCount={submissions.length}
      />
    </div>
  );
}
