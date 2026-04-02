'use client';

import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Upload, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { UploadModal } from '@/components/UploadModal';
import { useSubmissions, type ParsedSubmission } from '@/hooks/useSubmissions';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { Queue } from '@/lib/types';

function getQueueColor(queueId: string): string {
  const hash = queueId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    'border-l-indigo-500',
    'border-l-emerald-500',
    'border-l-rose-500',
    'border-l-amber-500',
    'border-l-violet-500',
    'border-l-blue-500',
  ];
  return colors[hash % colors.length];
}

interface QueueCardProps {
  queue: Queue;
}

function QueueCard({ queue }: QueueCardProps) {
  const borderColor = getQueueColor(queue.id);
  
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900',
        'border-l-4',
        borderColor
      )}
    >
      <h3 className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
        {queue.id}
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {queue.submissionCount} submissions
      </p>
      
      <div className="mt-3 flex flex-wrap gap-1.5">
        {queue.templates.map((template) => (
          <span
            key={template}
            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          >
            {template}
          </span>
        ))}
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Last submitted {new Date(queue.lastSubmitted).toLocaleDateString()}
        </span>
        <Link
          to={`/submissions/${queue.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          View Queue
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

function QueueCardSkeleton() {
  return (
    <div className="rounded-xl border border-l-4 border-slate-200 border-l-slate-300 bg-white p-4 shadow-sm dark:border-slate-800 dark:border-l-slate-600 dark:bg-slate-900">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-4 w-32" />
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

function QueuesGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <QueueCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SubmissionsPage() {
  const { queues, isLoading, uploadSubmissions } = useSubmissions();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const handleImport = useCallback(async (submissions: ParsedSubmission[]) => {
    const result = await uploadSubmissions(submissions);
    if (result.submissionCount === 0) {
      toast.error('No new submissions imported (they may already exist)');
      return;
    }
    toast.success(
      `Imported ${result.submissionCount} submissions across ${result.queueCount} queues`,
    );
  }, [uploadSubmissions]);

  const showEmpty = !isLoading && queues.length === 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-150">
      <PageHeader
        title="Submissions"
        subtitle="Upload and manage annotation submissions"
        actions={
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Upload className="size-4" />
            Upload JSON
          </Button>
        }
      />

      {isLoading ? (
        <QueuesGridSkeleton />
      ) : showEmpty ? (
        <EmptyState
          icon={Upload}
          title="No submissions yet"
          description="Upload a JSON file to get started"
          actionLabel="Upload JSON"
          onAction={() => setIsUploadOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {queues.map((queue) => (
            <QueueCard key={queue.id} queue={queue} />
          ))}
        </div>
      )}

      <UploadModal
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onImport={handleImport}
      />
    </div>
  );
}
