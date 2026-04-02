'use client';

import { useCallback } from 'react';
import { Plus, Pencil, Trash2, Scale, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ProviderBadge } from '@/components/ProviderBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { JudgeFormModal } from '@/components/JudgeFormModal';
import { JudgeTemplateModal } from '@/components/JudgeTemplateModal';
import { useJudges } from '@/hooks/useJudges';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { Judge, Provider } from '@/lib/types';

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

const PROVIDER_BORDER_COLORS: Record<Provider, string> = {
  openai: 'border-l-emerald-500',
  anthropic: 'border-l-violet-500',
  google: 'border-l-blue-500',
};

interface JudgeCardProps {
  judge: Judge;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

function JudgeCard({ judge, onEdit, onDelete, onToggleActive }: JudgeCardProps) {
  const borderColor = PROVIDER_BORDER_COLORS[judge.provider];

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900',
        'border-l-4',
        borderColor
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {judge.name}
          </h3>
          <Switch
            checked={judge.active}
            onCheckedChange={onToggleActive}
            aria-label={`Toggle ${judge.name} active state`}
          />
        </div>

        <div className="mt-2">
          <ProviderBadge provider={judge.provider} model={judge.model_name} />
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
          {judge.system_prompt}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <span className="text-xs text-slate-400">
          Created {formatRelativeDate(judge.created_at)}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label={`Edit ${judge.name}`}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            className="text-slate-400 hover:text-rose-600"
            aria-label={`Delete ${judge.name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function JudgeCardSkeleton() {
  return (
    <div className="rounded-xl border border-l-4 border-slate-200 border-l-slate-300 bg-white shadow-sm dark:border-slate-800 dark:border-l-slate-600 dark:bg-slate-900">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-10" />
        </div>
        <Skeleton className="mt-2 h-5 w-40" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-3/4" />
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <Skeleton className="h-3 w-24" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

function JudgesGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <JudgeCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function JudgesPage() {
  const { judges, isLoading, createJudge, updateJudge, deleteJudge, toggleActive } = useJudges();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null);
  const [deletingJudge, setDeletingJudge] = useState<Judge | null>(null);
  const [prefilledData, setPrefilledData] = useState<{
    name: string;
    prompt: string;
    model: string;
    provider: Provider;
  } | null>(null);

  const handleCreate = useCallback(() => {
    setEditingJudge(null);
    setPrefilledData(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((judge: Judge) => {
    setEditingJudge(judge);
    setPrefilledData(null);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback((judge: Judge) => {
    setDeletingJudge(judge);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deletingJudge) {
      await deleteJudge(deletingJudge.id);
      toast.success(`Judge "${deletingJudge.name}" deleted`);
      setDeletingJudge(null);
    }
  }, [deletingJudge, deleteJudge]);

  const handleToggleActive = useCallback(async (judgeId: string, judgeName: string, newState: boolean) => {
    await toggleActive(judgeId);
    toast.success(`Judge "${judgeName}" ${newState ? 'activated' : 'deactivated'}`);
  }, [toggleActive]);

  const handleSaveJudge = useCallback(
    async (data: { name: string; provider: Provider; model: string; prompt: string; active: boolean }) => {
      if (editingJudge) {
        await updateJudge(editingJudge.id, {
          name: data.name,
          provider: data.provider,
          model: data.model,
          prompt: data.prompt,
          active: data.active,
        });
        toast.success(`Judge "${data.name}" updated`);
      } else {
        await createJudge(data);
        toast.success(`Judge "${data.name}" created`);
      }
      setIsFormOpen(false);
      setEditingJudge(null);
      setPrefilledData(null);
    },
    [editingJudge, createJudge, updateJudge]
  );

  const handleSelectTemplate = useCallback(
    (template: { name: string; prompt: string; model: string; provider: Provider }) => {
      setIsTemplateOpen(false);
      setEditingJudge(null);
      setPrefilledData(template);
      setIsFormOpen(true);
    },
    []
  );

  const showEmpty = !isLoading && judges.length === 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-150">
      <PageHeader
        title="AI Judges"
        subtitle="Create and manage evaluation judges with custom rubrics"
        actions={
          <>
            <Button variant="outline" onClick={() => setIsTemplateOpen(true)}>
              <Copy className="size-4" />
              From Template
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="size-4" />
              New Judge
            </Button>
          </>
        }
      />

      {isLoading ? (
        <JudgesGridSkeleton />
      ) : showEmpty ? (
        <EmptyState
          icon={Scale}
          title="No judges configured"
          description="Create an AI judge with a custom rubric to start evaluating submissions"
          actionLabel="Create Judge"
          onAction={handleCreate}
          secondaryActionLabel="Use a Template"
          onSecondaryAction={() => setIsTemplateOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {judges.map((judge) => (
            <JudgeCard
              key={judge.id}
              judge={judge}
              onEdit={() => handleEdit(judge)}
              onDelete={() => handleDelete(judge)}
              onToggleActive={() => handleToggleActive(judge.id, judge.name, !judge.active)}
            />
          ))}
        </div>
      )}

      <JudgeFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSaveJudge}
        editingJudge={editingJudge}
        prefilledData={prefilledData}
      />

      <JudgeTemplateModal
        open={isTemplateOpen}
        onOpenChange={setIsTemplateOpen}
        onSelect={handleSelectTemplate}
      />

      <ConfirmDialog
        open={!!deletingJudge}
        onOpenChange={(open) => !open && setDeletingJudge(null)}
        title="Delete Judge"
        description={`Are you sure you want to delete "${deletingJudge?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
