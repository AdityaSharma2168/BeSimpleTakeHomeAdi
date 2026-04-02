import type { Evaluation } from '@/lib/types';

/**
 * Escapes a value for CSV format
 */
function escapeCSVValue(value: string | number | undefined): string {
  if (value === undefined || value === null) {
    return '';
  }
  const stringValue = String(value);
  // If the value contains a comma, newline, or double quote, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Converts evaluations to CSV format
 */
export function evaluationsToCSV(evaluations: Evaluation[]): string {
  const headers = [
    'Submission',
    'Question',
    'Judge',
    'Model',
    'Verdict',
    'Reasoning',
    'Latency (ms)',
    'Created',
  ];

  const rows = evaluations.map((e) => [
    escapeCSVValue(e.submission_id),
    escapeCSVValue(e.question_text),
    escapeCSVValue(e.judge_name),
    escapeCSVValue(`${e.judge_provider}/${e.judge_model}`),
    escapeCSVValue(e.verdict),
    escapeCSVValue(e.reasoning),
    escapeCSVValue(e.latency_ms),
    escapeCSVValue(e.created_at),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Downloads data as a CSV file
 */
export function downloadCSV(data: string, filename: string): void {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports evaluations to a CSV file with automatic filename
 */
export function exportEvaluationsCSV(evaluations: Evaluation[]): void {
  const csv = evaluationsToCSV(evaluations);
  const date = new Date().toISOString().split('T')[0];
  const filename = `evaluations-export-${date}.csv`;
  downloadCSV(csv, filename);
}
