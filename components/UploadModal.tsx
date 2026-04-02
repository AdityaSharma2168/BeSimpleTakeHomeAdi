'use client';

import { useState, useCallback, useRef } from 'react';
import { FileUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ParsedSubmission } from '@/hooks/useSubmissions';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (submissions: ParsedSubmission[]) => void;
}

interface ValidationResult {
  valid: boolean;
  submissions: ParsedSubmission[];
  errors: string[];
}

interface QuestionDataInput {
  id?: unknown;
  questionType?: unknown;
  questionText?: unknown;
}

interface QuestionInput {
  rev?: unknown;
  data?: QuestionDataInput;
}

interface AnswerInput {
  choice?: unknown;
  reasoning?: unknown;
}

interface AttachmentRefInput {
  fileName?: unknown;
}

interface SubmissionInput {
  id?: unknown;
  queueId?: unknown;
  labelingTaskId?: unknown;
  createdAt?: unknown;
  subjectMetadata?: unknown;
  attachments?: unknown;
  questions?: QuestionInput[];
  answers?: Record<string, AnswerInput>;
}

function validateSubmissions(data: unknown): ValidationResult {
  const errors: string[] = [];
  const submissions: ParsedSubmission[] = [];

  // Check if data is an array
  if (!Array.isArray(data)) {
    return { valid: false, submissions: [], errors: ['File must contain a JSON array'] };
  }

  if (data.length === 0) {
    return { valid: false, submissions: [], errors: ['Array must contain at least one submission'] };
  }

  // Validate each submission
  data.forEach((item: SubmissionInput, index: number) => {
    const submissionErrors: string[] = [];

    // Check required fields
    if (!item.id || typeof item.id !== 'string') {
      submissionErrors.push('id (string)');
    }
    if (!item.queueId || typeof item.queueId !== 'string') {
      submissionErrors.push('queueId (string)');
    }
    if (!item.questions || !Array.isArray(item.questions)) {
      submissionErrors.push('questions (array)');
    }
    if (!item.answers || typeof item.answers !== 'object' || item.answers === null) {
      submissionErrors.push('answers (object)');
    }

    if (submissionErrors.length > 0) {
      errors.push(`Submission ${index + 1}: Missing or invalid fields: ${submissionErrors.join(', ')}`);
      return;
    }

    // Validate questions and map to ParsedSubmission format
    const validQuestions: ParsedSubmission['questions'] = [];
    const answers = item.answers as Record<string, AnswerInput>;
    const subjectMetadata =
      item.subjectMetadata && typeof item.subjectMetadata === 'object'
        ? (item.subjectMetadata as Record<string, unknown>)
        : undefined;

    const attachmentRefs: { fileName: string }[] = [];
    if (Array.isArray(item.attachments)) {
      for (const a of item.attachments as AttachmentRefInput[]) {
        if (a && typeof a === 'object' && typeof a.fileName === 'string' && a.fileName.trim()) {
          attachmentRefs.push({ fileName: a.fileName.trim() });
        }
      }
    }
    
    (item.questions as QuestionInput[]).forEach((q: QuestionInput, qIndex: number) => {
      const questionErrors: string[] = [];

      // Check for questions[].data structure
      if (!q.data || typeof q.data !== 'object') {
        questionErrors.push('data object');
      } else {
        if (!q.data.id || typeof q.data.id !== 'string') {
          questionErrors.push('data.id');
        }
        if (!q.data.questionText || typeof q.data.questionText !== 'string') {
          questionErrors.push('data.questionText');
        }
      }

      if (questionErrors.length > 0) {
        errors.push(`Submission ${index + 1}, Question ${qIndex + 1}: Missing fields: ${questionErrors.join(', ')}`);
      } else {
        const templateId = q.data!.id as string;
        const answer = answers[templateId];
        
        // Transform to ParsedSubmission format
        validQuestions.push({
          templateId,
          questionText: q.data!.questionText as string,
          answer: answer?.choice ? String(answer.choice) : '',
          answerReasoning: answer?.reasoning ? String(answer.reasoning) : undefined,
        });
      }
    });

    if (validQuestions.length > 0 && submissionErrors.length === 0) {
      submissions.push({
        id: item.id as string,
        queueId: item.queueId as string,
        subjectMetadata,
        // temp shape: refs; we map to actual File objects in `handleImport`.
        attachments: attachmentRefs as unknown as ParsedSubmission['attachments'],
        questions: validQuestions,
      });
    }
  });

  return {
    valid: errors.length === 0,
    submissions,
    errors,
  };
}

export function UploadModal({ open, onOpenChange, onImport }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setValidationResult(null);
    setIsParsing(false);
    setIsImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const parseFile = useCallback((file: File) => {
    setIsParsing(true);
    setValidationResult(null);

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        const result = validateSubmissions(data);
        setValidationResult(result);
      } catch {
        setValidationResult({
          valid: false,
          submissions: [],
          errors: ['Invalid JSON: File could not be parsed as JSON'],
        });
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setValidationResult({
        valid: false,
        submissions: [],
        errors: ['Failed to read file'],
      });
      setIsParsing(false);
    };

    reader.readAsText(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const looksLikeJson =
      file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
    if (!looksLikeJson) {
      setValidationResult({
        valid: false,
        submissions: [],
        errors: ['Please upload a JSON file'],
      });
      return;
    }
    parseFile(file);
  }, [parseFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseFile(file);
  }, [parseFile]);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImport = useCallback(() => {
    if (!validationResult?.valid || validationResult.submissions.length === 0) return;
    
    setIsImporting(true);
    // Small delay to show loading state
    setTimeout(() => {
      onImport(validationResult.submissions);
      onOpenChange(false);
      resetState();
    }, 300);
  }, [validationResult, onImport, onOpenChange, resetState]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
    resetState();
  }, [onOpenChange, resetState]);

  const hasFile = validationResult !== null;
  const isValid = validationResult?.valid === true;
  const previewSubmissions = validationResult?.submissions.slice(0, 5) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
<DialogHeader>
            <DialogTitle>Upload Submissions</DialogTitle>
            <DialogDescription>
              Drag & drop a JSON file to import submissions.
            </DialogDescription>
          </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!hasFile ? (
          <div
            className={cn(
              'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors',
              isDragging
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                : 'border-slate-300 dark:border-slate-700'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mb-4 rounded-full bg-slate-100 p-3 dark:bg-slate-800">
              <FileUp className="size-6 text-slate-400" />
            </div>
            <p className="mb-1 text-sm font-medium text-slate-900 dark:text-slate-100">
              {isParsing ? 'Parsing file...' : 'Drag & drop your JSON file'}
            </p>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              or click to browse
            </p>
            <Button variant="outline" size="sm" onClick={handleBrowseClick} disabled={isParsing}>
              Browse Files
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Validation Status */}
            {isValid ? (
              <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <AlertDescription className="text-emerald-700 dark:text-emerald-300">
                  Valid file: {validationResult.submissions.length} submissions found
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Validation failed:</p>
                    <ul className="list-inside list-disc text-sm">
                      {validationResult?.errors.slice(0, 5).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {(validationResult?.errors.length || 0) > 5 && (
                        <li>... and {validationResult!.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview Table */}
            {previewSubmissions.length > 0 && (
              <div>
                <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                  Preview of first {previewSubmissions.length} submissions:
                </p>
                <div className="rounded-lg border border-slate-200 dark:border-slate-800">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">ID</TableHead>
                        <TableHead className="text-xs">Queue</TableHead>
                        <TableHead className="text-xs">Questions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewSubmissions.map((sub) => (
                        <TableRow
                          key={sub.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-900"
                        >
                          <TableCell className="font-mono text-xs">{sub.id}</TableCell>
                          <TableCell className="font-mono text-xs">{sub.queueId}</TableCell>
                          <TableCell>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              {sub.questions.length}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Try Again Button */}
            {!isValid && (
              <Button variant="outline" size="sm" onClick={resetState}>
                Try Another File
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          {hasFile && isValid && (
            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isImporting ? 'Importing...' : `Import ${validationResult.submissions.length} Submissions`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
