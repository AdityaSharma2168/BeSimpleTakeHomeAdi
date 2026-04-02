'use client';

import { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { MultiSelectFilter, ActiveFilters } from '@/components/MultiSelectFilter';
import { Skeleton } from '@/components/ui/skeleton';
import type { FilterOption } from '@/lib/types';

interface FilterBarProps {
  judgeOptions: FilterOption[];
  questionOptions: FilterOption[];
  verdictOptions: FilterOption[];
  selectedJudges: string[];
  selectedQuestions: string[];
  selectedVerdicts: string[];
  searchQuery: string;
  onJudgesChange: (judges: string[]) => void;
  onQuestionsChange: (questions: string[]) => void;
  onVerdictsChange: (verdicts: string[]) => void;
  onSearchChange: (query: string) => void;
  onClearAll: () => void;
}

export function FilterBar({
  judgeOptions,
  questionOptions,
  verdictOptions,
  selectedJudges,
  selectedQuestions,
  selectedVerdicts,
  searchQuery,
  onJudgesChange,
  onQuestionsChange,
  onVerdictsChange,
  onSearchChange,
  onClearAll,
}: FilterBarProps) {
  const activeFilters = [
    {
      key: 'judges',
      label: 'Judge',
      values: selectedJudges.map((id) => ({
        value: id,
        label: judgeOptions.find((o) => o.value === id)?.label || id,
      })),
    },
    {
      key: 'questions',
      label: 'Question',
      values: selectedQuestions.map((id) => ({
        value: id,
        label: id,
      })),
    },
    {
      key: 'verdicts',
      label: 'Verdict',
      values: selectedVerdicts.map((v) => ({
        value: v,
        label: v.charAt(0).toUpperCase() + v.slice(1),
      })),
    },
  ];

  const handleRemoveFilter = useCallback(
    (key: string, value: string) => {
      if (key === 'judges') {
        onJudgesChange(selectedJudges.filter((v) => v !== value));
      } else if (key === 'questions') {
        onQuestionsChange(selectedQuestions.filter((v) => v !== value));
      } else if (key === 'verdicts') {
        onVerdictsChange(selectedVerdicts.filter((v) => v !== value));
      }
    },
    [selectedJudges, selectedQuestions, selectedVerdicts, onJudgesChange, onQuestionsChange, onVerdictsChange]
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <MultiSelectFilter
          label="Judge"
          options={judgeOptions}
          selected={selectedJudges}
          onChange={onJudgesChange}
        />
        <MultiSelectFilter
          label="Question"
          options={questionOptions}
          selected={selectedQuestions}
          onChange={onQuestionsChange}
        />
        <MultiSelectFilter
          label="Verdict"
          options={verdictOptions}
          selected={selectedVerdicts}
          onChange={onVerdictsChange}
        />
        <div className="ml-auto">
          <Input
            placeholder="Search reasoning..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 w-64"
          />
        </div>
      </div>

      <div className="mb-4">
        <ActiveFilters
          filters={activeFilters}
          onRemove={handleRemoveFilter}
          onClearAll={onClearAll}
        />
      </div>
    </>
  );
}

export function FilterBarSkeleton() {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="ml-auto h-8 w-64" />
      </div>
      <div className="mb-4 h-6" />
    </>
  );
}
