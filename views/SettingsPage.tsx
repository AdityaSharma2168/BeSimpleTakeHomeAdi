'use client';

import { useSettings } from '@/hooks/useSettings';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

export function SettingsPage() {
  const {
    isLoading,
    openaiKey,
    setOpenaiKey,
    openaiKeyVisible,
    setOpenaiKeyVisible,
    anthropicKey,
    setAnthropicKey,
    anthropicKeyVisible,
    setAnthropicKeyVisible,
    googleKey,
    setGoogleKey,
    googleKeyVisible,
    setGoogleKeyVisible,
    concurrentEvals,
    setConcurrentEvals,
    evalTimeout,
    setEvalTimeout,
    isSaving,
    handleSaveKeys,
  } = useSettings();

  if (isLoading) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-150">
      <PageHeader
        title="Settings"
        subtitle="Configure API keys and preferences"
      />

      <div className="flex flex-col gap-6 max-w-3xl">
        {/* API Keys Card */}
        <Card>
          <CardHeader>
            <CardTitle>LLM Provider API Keys</CardTitle>
            <CardDescription>
              Keys are stored securely and used to authenticate with LLM providers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OpenAI Key */}
            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="openai-key"
                  type={openaiKeyVisible ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenaiKeyVisible(!openaiKeyVisible)}
                >
                  {openaiKeyVisible ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>

            {/* Anthropic Key */}
            <div className="space-y-2">
              <Label htmlFor="anthropic-key">Anthropic API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="anthropic-key"
                  type={anthropicKeyVisible ? 'text' : 'password'}
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAnthropicKeyVisible(!anthropicKeyVisible)}
                >
                  {anthropicKeyVisible ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>

            {/* Google Key */}
            <div className="space-y-2">
              <Label htmlFor="google-key">Google API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="google-key"
                  type={googleKeyVisible ? 'text' : 'password'}
                  value={googleKey}
                  onChange={(e) => setGoogleKey(e.target.value)}
                  placeholder="AIza..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGoogleKeyVisible(!googleKeyVisible)}
                >
                  {googleKeyVisible ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={handleSaveKeys}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving && <Spinner className="h-4 w-4" />}
                {isSaving ? 'Saving...' : 'Save Keys'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Evaluation Preferences Card */}
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Preferences</CardTitle>
            <CardDescription>
              Configure evaluation job behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Concurrent Evals */}
            <div className="space-y-2">
              <Label htmlFor="concurrent-evals">Concurrent Evaluations</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="concurrent-evals"
                  type="number"
                  min="1"
                  max="20"
                  value={concurrentEvals}
                  onChange={(e) => setConcurrentEvals(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Maximum parallel evaluation jobs
                </span>
              </div>
            </div>

            {/* Eval Timeout */}
            <div className="space-y-2">
              <Label htmlFor="eval-timeout">Evaluation Timeout (seconds)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="eval-timeout"
                  type="number"
                  min="5"
                  max="300"
                  value={evalTimeout}
                  onChange={(e) => setEvalTimeout(Math.max(5, parseInt(e.target.value) || 30))}
                  className="w-20"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Seconds before timeout
                </span>
              </div>
            </div>

            {/* Auto-save Notice */}
            <p className="text-xs text-slate-500 dark:text-slate-500 pt-4 border-t border-slate-200 dark:border-slate-800">
              Preferences are auto-saved
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-150">
      <PageHeader
        title="Settings"
        subtitle="Configure API keys and preferences"
      />

      <div className="flex flex-col gap-6 max-w-3xl">
        {/* API Keys Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex gap-2">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-16" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>

        {/* Preferences Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-2 h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-10 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
