'use client';

import { useState, useCallback } from 'react';
import { Download, RefreshCw, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { CompareModal } from '@/components/CompareModal';
import {
  StatsOverview,
  StatsOverviewSkeleton,
  ChartsSection,
  ChartsSectionSkeleton,
  FilterBar,
  FilterBarSkeleton,
  ResultsTable,
  ResultsTableSkeleton,
} from '@/components/results';
import { useResults } from '@/hooks/useEvaluations';
import { exportEvaluationsCSV } from '@/lib/export';
import type { Evaluation } from '@/lib/types';

type SortField = 'verdict' | 'judge' | 'latency' | 'created';
type SortDirection = 'asc' | 'desc';

export function ResultsPage() {
  const [selectedJudges, setSelectedJudges] = useState<string[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [selectedVerdicts, setSelectedVerdicts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('created');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [compareEvals, setCompareEvals] = useState<Evaluation[] | null>(null);

  const filters = {
    judges: selectedJudges,
    questions: selectedQuestions,
    verdicts: selectedVerdicts,
    searchQuery,
  };

  const {
    evaluations,
    filteredEvaluations,
    stats,
    isLoading,
    judgeOptions,
    questionOptions,
    verdictOptions,
    groupedEvaluations,
    retryFailed,
  } = useResults(filters, sortBy, sortDir);

  const handleSort = useCallback((column: SortField) => {
    if (sortBy === column) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  }, [sortBy]);

  const clearAllFilters = useCallback(() => {
    setSelectedJudges([]);
    setSelectedQuestions([]);
    setSelectedVerdicts([]);
    setSearchQuery('');
  }, []);

  const handleExport = useCallback(() => {
    exportEvaluationsCSV(filteredEvaluations);
    toast.success(`Exported ${filteredEvaluations.length} evaluations to CSV`);
  }, [filteredEvaluations]);

  const handleRetryFailed = useCallback(async () => {
    await retryFailed();
  }, [retryFailed]);

  const showEmpty = !isLoading && evaluations.length === 0;
  const hasFailedEvals = stats.failCount > 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-150">
      <PageHeader
        title="Evaluation Results"
        subtitle="Review and analyze AI judge evaluations"
        actions={
          <>
            {hasFailedEvals && (
              <Button variant="ghost" onClick={handleRetryFailed}>
                <RefreshCw className="size-4" />
                Retry Failed
              </Button>
            )}
            <Button variant="outline" onClick={handleExport} disabled={isLoading}>
              <Download className="size-4" />
              Export CSV
            </Button>
          </>
        }
      />

      {showEmpty ? (
        <EmptyState
          icon={BarChart3}
          title="No evaluations yet"
          description="Run AI judges on your submissions to see results here"
          actionLabel="Go to Submissions"
          onAction={() => {}}
        />
      ) : isLoading ? (
        <>
          <StatsOverviewSkeleton />
          <ChartsSectionSkeleton />
          <FilterBarSkeleton />
          <ResultsTableSkeleton />
        </>
      ) : (
        <>
          <StatsOverview stats={stats} />
          <ChartsSection evaluations={evaluations} />
          <FilterBar
            judgeOptions={judgeOptions}
            questionOptions={questionOptions}
            verdictOptions={verdictOptions}
            selectedJudges={selectedJudges}
            selectedQuestions={selectedQuestions}
            selectedVerdicts={selectedVerdicts}
            searchQuery={searchQuery}
            onJudgesChange={setSelectedJudges}
            onQuestionsChange={setSelectedQuestions}
            onVerdictsChange={setSelectedVerdicts}
            onSearchChange={setSearchQuery}
            onClearAll={clearAllFilters}
          />
          <ResultsTable
            evaluations={filteredEvaluations}
            groupedEvaluations={groupedEvaluations}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onCompare={setCompareEvals}
            onClearFilters={clearAllFilters}
          />
        </>
      )}

      {compareEvals && (
        <CompareModal
          open={!!compareEvals}
          onOpenChange={(open) => !open && setCompareEvals(null)}
          evaluations={compareEvals}
        />
      )}
    </div>
  );
}
