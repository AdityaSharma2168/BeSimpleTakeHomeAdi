'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { MODELS_BY_PROVIDER } from '@/data/mockJudges';
import { cn } from '@/lib/utils';
import type { Judge, Provider } from '@/lib/types';

const MAX_PROMPT_LENGTH = 2000;
const MIN_PROMPT_LENGTH = 20;

interface JudgeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; provider: Provider; model: string; prompt: string; active: boolean }) => void;
  editingJudge: Judge | null;
  prefilledData: { name: string; prompt: string; model: string; provider: Provider } | null;
}

export function JudgeFormModal({
  open,
  onOpenChange,
  onSave,
  editingJudge,
  prefilledData,
}: JudgeFormModalProps) {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<Provider>('openai');
  const [model, setModel] = useState('gpt-4o');
  const [prompt, setPrompt] = useState('');
  const [active, setActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; prompt?: string }>({});

  useEffect(() => {
    if (editingJudge) {
      setName(editingJudge.name);
      setProvider(editingJudge.provider);
      setModel(editingJudge.model_name);
      setPrompt(editingJudge.system_prompt);
      setActive(editingJudge.active);
    } else if (prefilledData) {
      setName(prefilledData.name);
      setProvider(prefilledData.provider);
      setModel(prefilledData.model);
      setPrompt(prefilledData.prompt);
      setActive(true);
    } else {
      setName('');
      setProvider('openai');
      setModel('gpt-4o');
      setPrompt('');
      setActive(true);
    }
    setErrors({});
  }, [editingJudge, prefilledData, open]);

  const handleProviderChange = useCallback((newProvider: Provider) => {
    setProvider(newProvider);
    const models = MODELS_BY_PROVIDER[newProvider];
    if (models && models.length > 0) {
      setModel(models[0]);
    }
  }, []);

  const validate = useCallback(() => {
    const newErrors: { name?: string; prompt?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (prompt.length < MIN_PROMPT_LENGTH) {
      newErrors.prompt = `Prompt must be at least ${MIN_PROMPT_LENGTH} characters`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, prompt]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    setIsSaving(true);
    // Simulate save delay
    setTimeout(() => {
      onSave({ name, provider, model, prompt, active });
      setIsSaving(false);
    }, 500);
  }, [validate, onSave, name, provider, model, prompt, active]);

  const availableModels = MODELS_BY_PROVIDER[provider] || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingJudge ? 'Edit Judge' : 'Create Judge'}</DialogTitle>
          <DialogDescription>Configure the judge name, model, and evaluation prompt</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Factual Accuracy"
              className={cn(errors.name && 'border-rose-500 focus-visible:ring-rose-500')}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-500">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Provider
              </label>
              <Select value={provider} onValueChange={(v) => handleProviderChange(v as Provider)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Model
              </label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              System Prompt
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter the evaluation rubric and instructions for the judge..."
              rows={6}
              className={cn(
                'font-mono text-sm',
                errors.prompt && 'border-rose-500 focus-visible:ring-rose-500'
              )}
            />
            <div className="mt-1 flex items-center justify-between">
              {errors.prompt ? (
                <p className="text-xs text-rose-500">{errors.prompt}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-slate-400">
                {prompt.length} / {MAX_PROMPT_LENGTH}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Active
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inactive judges won&apos;t be available for assignment
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isSaving && <Spinner className="size-4" />}
            {isSaving ? 'Saving...' : 'Save Judge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
