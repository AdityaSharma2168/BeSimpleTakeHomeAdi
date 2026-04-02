# AI Judge Platform — Backend Integration Plan (Cursor Context)

## Project Overview

This is a take-home assignment for Besimple AI. We're building an "AI Judge" platform — a web app where users upload annotation submissions, configure AI judges with custom rubrics, assign them to questions, run LLM-based evaluations, and view results with filters and analytics.

**The frontend is 100% complete** — all pages, components, modals, drawers, charts, filters, and interactions are built and working with mock data. The job now is to wire up a real backend (Supabase) and real LLM API calls (OpenAI, Anthropic, Google).

## What's Already Built (DO NOT modify unless necessary)

### Pages (in /views)
- `SubmissionsPage.tsx` — Upload JSON, shows queue cards grouped by queueId
- `QueueDetailPage.tsx` — Shows submissions in a queue, assign judges drawer, run evaluations with progress panel
- `JudgesPage.tsx` — CRUD for AI judges with cards, create/edit modal, template picker
- `ResultsPage.tsx` — Evaluation results with stat cards, charts, filters, sortable table, CSV export, comparison modal
- `SettingsPage.tsx` — API key management, preferences

### Components (in /components)
- `UploadModal.tsx` — Drag-and-drop JSON upload with validation and preview
- `JudgeFormModal.tsx` — Create/edit judge form
- `JudgeTemplateModal.tsx` — Pre-built judge template picker
- `JudgeAssignmentDrawer.tsx` — Assign judges to question templates per queue
- `RunEvaluationModal.tsx` — Cost estimation before running
- `CompareModal.tsx` — Side-by-side judge comparison
- `results/` — StatsOverview, ChartsSection, FilterBar, ResultsTable (all sub-components of ResultsPage)
- Shared: VerdictBadge, ProviderBadge, EmptyState, PageHeader, AnimatedCounter, ConfirmDialog, MultiSelectFilter

### Hooks (in /hooks) — THESE ARE WHAT YOU'LL MODIFY
Every hook has `// TODO: Replace with Supabase call` markers. Each exports async functions with typed interfaces.

- `useJudges.ts` — CRUD for judges. Returns `{ judges, isLoading, createJudge, updateJudge, deleteJudge, toggleActive }`
- `useSubmissions.ts` — Upload and list submissions. Exports `useSubmissions()` returning `{ queues, isLoading, uploadSubmissions }` and `useQueueDetail(queueId)` returning `{ submissions, templates, isLoading, evalLog }`
- `useEvaluations.ts` — Run evaluations and view results. Exports `useEvaluations()` returning `{ evaluations, isLoading, runEvaluations }` and `useResults(filters, sortBy, sortDir)` returning `{ evaluations, filteredEvaluations, stats, isLoading, judgeOptions, questionOptions, verdictOptions, groupedEvaluations }`
- `useSettings.ts` — API key management
- `useTheme.ts` — Dark mode (leave alone)
- `useMobile.ts` — Responsive detection (leave alone)
- `useToast.ts` — Toast utility (leave alone)

### Types (in /lib/types.ts)
```typescript
type Verdict = 'pass' | 'fail' | 'inconclusive'
type Provider = 'openai' | 'anthropic' | 'google'

interface Queue { id, submissionCount, templates, lastSubmitted }
interface Submission { id, queueId, questionCount, answerCount, submittedAt, status, questions }
interface SubmissionQuestion { templateId, questionText, answer, answerReasoning }
interface Judge { id, name, system_prompt, model_name, provider, active, created_at }
interface Evaluation { id, submission_id, question_template_id, question_text, judge_id, judge_name, judge_model, judge_provider, verdict, reasoning, tokens_used, latency_ms, created_at }
interface JudgeAssignment { templateId, judgeIds, includeQuestionText, includeAnswerChoice, includeAnswerReasoning, includeQuestionType, includeSubmissionMetadata }
```

### Mock Data (in /data)
- `mockJudges.ts` — 5 pre-configured judges
- `mockSubmissions.ts` — 7 submissions with questions and answers
- `mockEvaluations.ts` — 18 evaluations with mixed verdicts
- `mockQueues.ts` — 3 queues

## Tech Stack
- React 19 + TypeScript (strict, zero `any`)
- Next.js (App Router, but routing is done via React Router in components/App.tsx with catch-all at app/[[...slug]]/page.tsx)
- Tailwind CSS + shadcn/ui
- Recharts for charts
- Sonner for toasts
- Supabase for backend (to be wired up)
- OpenAI, Anthropic, Google Gemini SDKs for LLM calls (to be added)

## The Assignment Requirements (from the spec)
1. Accept JSON file upload, persist submissions in cloud backend (Supabase)
2. CRUD for AI judges, persisted in backend
3. Assign judges to questions per queue, persisted in backend
4. "Run AI Judges" — call real LLM APIs for every (question × judge) pair, store verdict + reasoning in backend
5. Results page with filters, pass rate stats
6. Handle errors gracefully (timeouts, quota errors)
7. NO localStorage for data, NO SQLite, NO in-memory only

## Evaluation Rubric
- Correctness: meets all functional requirements without crashes
- Backend & LLM: clean persistence layer and proper LLM integration
- Code quality: clear naming, small components, idiomatic React
- Types & safety: accurate TypeScript types, minimal any
- UX & polish: usable layout, sensible empty/loading states
- Judgment & trade-offs: clear reasoning in README

---

# PHASE-BY-PHASE IMPLEMENTATION PLAN

## Phase 1: Foundation Setup

### 1A. Fix existing issues
- Delete duplicate hook files: `hooks/use-mobile.ts` and `hooks/use-toast.ts` (camelCase versions already exist)
- Change `package.json` name from `"my-project"` to `"ai-judge-platform"`
- Verify no imports reference the deleted files (grep for `use-mobile` and `use-toast`)

### 1B. Set up Supabase client
Replace `lib/supabase.ts` with:
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### 1C. Create database tables
The user will run this SQL in Supabase Dashboard. Tables needed:

```sql
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  queue_id TEXT NOT NULL,
  labeling_task_id TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id TEXT REFERENCES submissions(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  rev INT NOT NULL DEFAULT 1
);

CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id TEXT REFERENCES submissions(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  choice TEXT,
  choices JSONB,
  reasoning TEXT,
  freeform_text TEXT
);

CREATE TABLE judges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE judge_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id UUID REFERENCES judges(id) ON DELETE CASCADE,
  queue_id TEXT NOT NULL,
  question_template_id TEXT NOT NULL,
  prompt_config JSONB DEFAULT '{"include_question_text": true, "include_answer_choice": true, "include_answer_reasoning": true, "include_question_type": false, "include_metadata": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(judge_id, queue_id, question_template_id)
);

CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id UUID REFERENCES judges(id),
  submission_id TEXT REFERENCES submissions(id),
  question_template_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('pass', 'fail', 'inconclusive')),
  reasoning TEXT NOT NULL,
  model_used TEXT NOT NULL,
  tokens_used INT,
  latency_ms INT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_submissions_queue ON submissions(queue_id);
CREATE INDEX idx_questions_submission ON questions(submission_id);
CREATE INDEX idx_questions_template ON questions(template_id);
CREATE INDEX idx_answers_submission ON answers(submission_id);
CREATE INDEX idx_evaluations_submission ON evaluations(submission_id);
CREATE INDEX idx_evaluations_judge ON evaluations(judge_id);
CREATE INDEX idx_evaluations_verdict ON evaluations(verdict);
CREATE INDEX idx_judge_assignments_queue ON judge_assignments(queue_id);

-- RLS with permissive policies (no auth for take-home)
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON judges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON judge_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON evaluations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON settings FOR ALL USING (true) WITH CHECK (true);
```

### 1D. Install dependencies
```bash
pnpm add @supabase/supabase-js openai @anthropic-ai/sdk @google/generative-ai zod
```

**After Phase 1: `pnpm dev` should compile. App should work exactly as before with mock data. Commit: "feat: supabase client setup and dependencies"**

---

## Phase 2: Swap useJudges Hook

Replace mock data in `hooks/useJudges.ts` with real Supabase calls. 

Rules:
- Keep the EXACT same return interface (`UseJudgesReturn`)
- Don't change any component or view files
- The Supabase `judges` table columns are: `id` (UUID), `name`, `system_prompt`, `model_name`, `provider`, `active`, `created_at`, `updated_at`
- Note the types mismatch: the frontend `Judge` type uses `id: string` but Supabase returns UUID as string — this is fine
- Add try/catch around every Supabase call, show `toast.error()` on failure
- After each mutation (create/update/delete/toggle), refetch the full judges list to stay in sync
- Import `toast` from `sonner` for error notifications
- Remove the mock data import (`MOCK_JUDGES`)
- Remove the `SIMULATED_DELAY` — real network latency replaces it

**After Phase 2: Create a judge in the UI → refresh page → judge should still be there. Delete → refresh → gone. This proves persistence works. Commit: "feat: wire useJudges to Supabase"**

---

## Phase 3: Swap useSubmissions Hook

Replace mock data in `hooks/useSubmissions.ts` with real Supabase calls.

This is more complex because upload needs to:
1. Parse the uploaded JSON (already done in UploadModal)
2. Insert each submission into `submissions` table (with `raw_json` storing the original)
3. For each submission, insert normalized rows into `questions` and `answers` tables
4. Refetch the queue list after upload

For `useSubmissions()`:
- `queues` should be derived by querying `SELECT queue_id, COUNT(*) as count FROM submissions GROUP BY queue_id`
- Also query distinct template_ids per queue from the `questions` table
- Build the `Queue[]` array from these queries

For `useQueueDetail(queueId)`:
- Query submissions filtered by `queue_id`
- Join with questions and answers to build the `Submission` objects with `questions` array
- Query evaluations for this queue to determine submission status ('evaluated' vs 'pending')
- Get templates from the questions table

For `uploadSubmissions`:
- Accept the `ParsedSubmission[]` from UploadModal
- Insert into submissions table (store raw_json as the original parsed object)
- Insert into questions table (template_id, question_type, question_text from each question)
- Insert into answers table (template_id, choice, reasoning from the answers object)
- Return the count of imported submissions and queues
- Handle duplicate submission IDs gracefully (skip or upsert)

Remove the shared store pattern (`useSyncExternalStore`, `listeners`, `emitChange`) — with Supabase as the source of truth, each hook just fetches fresh data.

**After Phase 3: Upload sample JSON → refresh page → submissions still there. Click into queue → see the submissions with questions/answers. Commit: "feat: wire useSubmissions to Supabase"**

---

## Phase 4: Swap useSettings Hook

Replace mock data in `hooks/useSettings.ts` with real Supabase calls.

- API keys are stored in the `settings` table with `key` (e.g., 'openai_api_key') and `value` columns
- Fetch settings on mount
- Save keys: upsert into settings table
- Test connection: make a lightweight API call to verify the key works (can be done via an API route)
- IMPORTANT: API keys stored in the `settings` table are only for the UI to show "Connected" / "Not configured" status. The actual LLM calls in Phase 5 will read keys from server-side environment variables (NOT from the database), since API routes have access to `process.env` directly.

**After Phase 4: Enter an API key → save → refresh → key should still be there. Commit: "feat: wire useSettings to Supabase"**

---

## Phase 5: LLM API Route

Create `app/api/evaluate/route.ts` — a Next.js API route that:
1. Accepts POST with `{ systemPrompt, userPrompt, model, provider }`
2. Reads the API key from `process.env` (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY)
3. Calls the appropriate provider
4. Parses the response to extract `{ verdict, reasoning }`
5. Returns the result

### Provider implementations:

**OpenAI** (`gpt-4o`, `gpt-4o-mini`):
```typescript
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const response = await client.chat.completions.create({
  model: model,
  response_format: { type: "json_object" },
  messages: [
    { role: "system", content: systemPrompt + '\n\nRespond with ONLY a JSON object: { "verdict": "pass" | "fail" | "inconclusive", "reasoning": "your brief explanation" }' },
    { role: "user", content: userPrompt }
  ],
});
const parsed = JSON.parse(response.choices[0].message.content);
```

**Anthropic** (`claude-sonnet-4-20250514`):
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const response = await client.messages.create({
  model: model,
  max_tokens: 1024,
  system: systemPrompt + '\n\nRespond with ONLY a JSON object: { "verdict": "pass" | "fail" | "inconclusive", "reasoning": "your brief explanation" }',
  messages: [{ role: "user", content: userPrompt }],
});
const parsed = JSON.parse(response.content[0].text);
```

**Google** (`gemini-1.5-pro`, `gemini-1.5-flash`):
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const model = genAI.getGenerativeModel({ model: modelName });
const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt + '\n\nRespond with ONLY a JSON object: { "verdict": "pass" | "fail" | "inconclusive", "reasoning": "your brief explanation" }');
const parsed = JSON.parse(result.response.text());
```

### Validate with Zod:
```typescript
import { z } from 'zod';

const LLMResponseSchema = z.object({
  verdict: z.enum(['pass', 'fail', 'inconclusive']),
  reasoning: z.string().min(1),
});
```

### Error handling:
- Missing API key → return 401 with `{ error: "API key not configured for {provider}" }`
- Rate limit (429 from provider) → return 429 with `{ error: "Rate limit exceeded" }`
- Timeout → return 504 with `{ error: "Request timed out" }`
- Invalid JSON from LLM → return 502 with `{ error: "Failed to parse LLM response" }`
- General error → return 500 with `{ error: message }`

### Also create a prompt builder utility at `lib/promptBuilder.ts`:
```typescript
export function buildEvaluationPrompt(
  question: { questionText: string; questionType?: string },
  answer: { choice?: string; reasoning?: string },
  promptConfig: {
    includeQuestionText: boolean;
    includeAnswerChoice: boolean;
    includeAnswerReasoning: boolean;
    includeQuestionType: boolean;
    includeSubmissionMetadata: boolean;
  }
): string {
  const parts: string[] = [];
  if (promptConfig.includeQuestionText) parts.push(`Question: ${question.questionText}`);
  if (promptConfig.includeQuestionType && question.questionType) parts.push(`Type: ${question.questionType}`);
  if (promptConfig.includeAnswerChoice && answer.choice) parts.push(`Answer: ${answer.choice}`);
  if (promptConfig.includeAnswerReasoning && answer.reasoning) parts.push(`Reasoning: ${answer.reasoning}`);
  return parts.join('\n');
}
```

**After Phase 5: Test the API route directly with curl or from the browser console. Commit: "feat: LLM evaluation API route with OpenAI, Anthropic, Google"**

---

## Phase 6: Wire Up Evaluation Runner

This is the most complex part. Update `hooks/useEvaluations.ts` and the QueueDetailPage's evaluation flow.

### The `runEvaluations` flow:
1. Fetch judge_assignments for the current queue from Supabase
2. Fetch all submissions in the queue with their questions and answers
3. For each (submission × question × assigned judge) triple:
   a. Build the prompt using `buildEvaluationPrompt`
   b. Call `/api/evaluate` with the judge's system prompt, the built user prompt, model, and provider
   c. Record start time for latency measurement
   d. On success: insert evaluation record into Supabase `evaluations` table
   e. On failure: log the error, continue with remaining evaluations
   f. Update progress state after each evaluation completes (for the progress panel UI)
4. Use concurrency limiting — max 5 parallel requests (use a simple semaphore pattern or p-limit if installed)
5. Implement retry with exponential backoff: on 429 errors, wait 2^attempt seconds, max 3 retries
6. After all evaluations complete, show summary via the existing progress panel UI

### Also need to:
- Wire `useQueueDetail` to save/load judge assignments from the `judge_assignments` table
- The JudgeAssignmentDrawer currently uses local state — assignments need to persist to Supabase
- Wire `useResults` to fetch evaluations from Supabase instead of mock data
- The stats, filters, and sorting can stay client-side (compute from fetched data)

**After Phase 6: Full flow works — assign judges → run evaluations → see real LLM verdicts in the results page. Commit: "feat: wire evaluation runner with real LLM calls"**

---

## Phase 7: Final Polish

### README (CRITICAL — it's a rubric category)
Rewrite README.md with:
- Project overview (what it does)
- Architecture decisions:
  - "Used Supabase for persistence — relational model fits the data well"
  - "LLM calls go through Next.js API routes to keep API keys server-side"
  - "Used React Router within Next.js for flexible client-side routing"
  - "Frontend built with v0, backend wired manually"
- Setup instructions (env vars, Supabase setup, how to run)
- Trade-offs:
  - "No authentication — would add Supabase Auth in production"
  - "API keys in env vars — would use a secrets manager in production"
  - "Client-side filtering/sorting — would move to server-side with pagination for large datasets"
- Bonus features implemented:
  - Animated charts (pass rate by judge, verdict donut)
  - Prompt field selector (choose which fields to include)
  - Judge templates
  - CSV export
  - Cost estimation
  - Comparison view for disagreeing judges
  - Dark mode
  - Real-time evaluation progress
- Time spent: ~X hours

### Other polish:
- Test full flow end-to-end
- Make sure empty states show correctly when database is empty
- Verify error toasts fire on network failures
- Test with the sample JSON from the spec

**After Phase 7: Record Loom, submit. Commit: "docs: add README with architecture decisions and trade-offs"**

---

## CRITICAL RULES FOR ALL PHASES

1. **NEVER add `any` types.** Use `unknown` with type guards if needed. The rubric explicitly scores "minimal any."
2. **NEVER modify view or component files** unless absolutely necessary for the backend integration. The UI is done.
3. **Keep the same hook return interfaces.** Components call hooks — if the interface changes, components break.
4. **Always add try/catch** around Supabase calls and API calls. Show `toast.error()` on failure.
5. **Test after every phase** by running `pnpm dev` and clicking through the relevant feature.
6. **Commit after every phase** with a descriptive message.
7. **Keep mock data files** — don't delete them. They're useful for testing and as a reference for data shapes.
