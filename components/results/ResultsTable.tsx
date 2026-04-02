'use client';

import { useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VerdictBadge } from '@/components/VerdictBadge';
import { ProviderBadge } from '@/components/ProviderBadge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EmptyState } from '@/components/EmptyState';
import { BarChart3 } from 'lucide-react';
import type { Evaluation } from '@/lib/types';

const ITEMS_PER_PAGE = 25;

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

interface EvaluationRowProps {
  evaluation: Evaluation;
  isExpanded: boolean;
  onToggle: () => void;
  canCompare: boolean;
  onCompare: () => void;
}

function EvaluationRow({ evaluation, isExpanded, onToggle, canCompare, onCompare }: EvaluationRowProps) {
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
        <TableCell className="font-mono text-xs">{evaluation.submission_id}</TableCell>
        <TableCell>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[180px] truncate text-sm">
                {evaluation.question_text}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              {evaluation.question_text}
            </TooltipContent>
          </Tooltip>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{evaluation.judge_name}</span>
            <ProviderBadge
              provider={evaluation.judge_provider}
              model={evaluation.judge_model}
              className="text-[10px]"
            />
          </div>
        </TableCell>
        <TableCell>
          <VerdictBadge verdict={evaluation.verdict} />
        </TableCell>
        <TableCell>
          <span className="block max-w-[150px] truncate text-sm text-slate-500">
            {evaluation.reasoning}
          </span>
        </TableCell>
        <TableCell className="text-sm text-slate-500">{evaluation.latency_ms}ms</TableCell>
        <TableCell className="text-sm text-slate-400">
          {formatRelativeDate(evaluation.created_at)}
        </TableCell>
        <TableCell>
          {canCompare && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCompare();
              }}
              className="h-6 px-2 text-xs"
            >
              Compare
            </Button>
          )}
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-slate-50 dark:bg-slate-900/50">
          <TableCell colSpan={9} className="p-0">
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div>
                <h4 className="mb-1 text-xs font-medium text-slate-500">Full Question</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {evaluation.question_text}
                </p>
              </div>
              <div>
                <h4 className="mb-1 text-xs font-medium text-slate-500">Answer</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {evaluation.answer || 'N/A'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <h4 className="mb-1 text-xs font-medium text-slate-500">Full Reasoning</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {evaluation.reasoning}
                </p>
              </div>
              <div>
                <h4 className="mb-1 text-xs font-medium text-slate-500">Model Used</h4>
                <ProviderBadge provider={evaluation.judge_provider} model={evaluation.judge_model} />
              </div>
              <div>
                <h4 className="mb-1 text-xs font-medium text-slate-500">Tokens Used</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {evaluation.tokens_used}
                </p>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

type SortField = 'verdict' | 'judge' | 'latency' | 'created';
type SortDirection = 'asc' | 'desc';

interface ResultsTableProps {
  evaluations: Evaluation[];
  groupedEvaluations: Record<string, Evaluation[]>;
  sortBy: SortField;
  sortDir: SortDirection;
  onSort: (field: SortField) => void;
  onCompare: (evaluations: Evaluation[]) => void;
  onClearFilters?: () => void;
}

export function ResultsTable({
  evaluations,
  groupedEvaluations,
  sortBy,
  sortDir,
  onSort,
  onCompare,
  onClearFilters,
}: ResultsTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalPages = Math.ceil(evaluations.length / ITEMS_PER_PAGE);
  const paginatedEvaluations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return evaluations.slice(start, start + ITEMS_PER_PAGE);
  }, [evaluations, currentPage]);

  const handleCompare = useCallback(
    (evaluation: Evaluation) => {
      const key = `${evaluation.submission_id}-${evaluation.question_template_id}`;
      const group = groupedEvaluations[key];
      if (group && group.length > 1) {
        onCompare(group);
      }
    },
    [groupedEvaluations, onCompare]
  );

  if (evaluations.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 p-8">
        <EmptyState
          icon={BarChart3}
          title="No results match your filters"
          description="Try adjusting your filters or search query"
        />
        {onClearFilters && (
          <div className="mt-4 flex justify-center">
            <Button
              onClick={onClearFilters}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8" />
            <TableHead className="text-xs">Submission</TableHead>
            <TableHead className="text-xs">Question</TableHead>
            <TableHead
              className="cursor-pointer text-xs"
              onClick={() => onSort('judge')}
            >
              Judge {sortBy === 'judge' && (sortDir === 'asc' ? '���' : '↓')}
            </TableHead>
            <TableHead
              className="cursor-pointer text-xs"
              onClick={() => onSort('verdict')}
            >
              Verdict {sortBy === 'verdict' && (sortDir === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="text-xs">Reasoning</TableHead>
            <TableHead
              className="cursor-pointer text-xs"
              onClick={() => onSort('latency')}
            >
              Latency {sortBy === 'latency' && (sortDir === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead
              className="cursor-pointer text-xs"
              onClick={() => onSort('created')}
            >
              Created {sortBy === 'created' && (sortDir === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedEvaluations.map((evaluation) => {
            const key = `${evaluation.submission_id}-${evaluation.question_template_id}`;
            const canCompare = (groupedEvaluations[key]?.length || 0) > 1;
            return (
              <EvaluationRow
                key={evaluation.id}
                evaluation={evaluation}
                isExpanded={expandedIds.has(evaluation.id)}
                onToggle={() => toggleExpanded(evaluation.id)}
                canCompare={canCompare}
                onCompare={() => handleCompare(evaluation)}
              />
            );
          })}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800">
        <span className="text-sm text-slate-500">
          Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
          {Math.min(currentPage * ITEMS_PER_PAGE, evaluations.length)} of{' '}
          {evaluations.length} results
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ResultsTableSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8" />
            <TableHead className="text-xs">Submission</TableHead>
            <TableHead className="text-xs">Question</TableHead>
            <TableHead className="text-xs">Judge</TableHead>
            <TableHead className="text-xs">Verdict</TableHead>
            <TableHead className="text-xs">Reasoning</TableHead>
            <TableHead className="text-xs">Latency</TableHead>
            <TableHead className="text-xs">Created</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-4" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-14" /></TableCell>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-14" /></TableCell>
              <TableCell><Skeleton className="h-6 w-16" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800">
        <Skeleton className="h-4 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}
