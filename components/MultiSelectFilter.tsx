'use client';

import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { FilterOption } from '@/lib/types';

interface MultiSelectFilterProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  className,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8 gap-1 border-dashed', className)}
        >
          {label}
          {selected.length > 0 && (
            <span className="ml-1 rounded-full bg-indigo-100 px-1.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              {selected.length}
            </span>
          )}
          <ChevronDown className="ml-1 size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="flex flex-col gap-1">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={() => handleToggle(option.value)}
              />
              {option.dotColor && (
                <span className={cn('size-2 rounded-full', option.dotColor)} />
              )}
              <span className="truncate">{option.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ActiveFiltersProps {
  filters: { key: string; label: string; values: { value: string; label: string }[] }[];
  onRemove: (key: string, value: string) => void;
  onClearAll: () => void;
}

export function ActiveFilters({ filters, onRemove, onClearAll }: ActiveFiltersProps) {
  const hasFilters = filters.some((f) => f.values.length > 0);

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) =>
        filter.values.map((v) => (
          <span
            key={`${filter.key}-${v.value}`}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {filter.label}: {v.label}
            <button
              type="button"
              onClick={() => onRemove(filter.key, v.value)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <X className="size-3" />
            </button>
          </span>
        ))
      )}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        Clear all
      </button>
    </div>
  );
}
