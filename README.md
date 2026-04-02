# AI Judge — LLM Evaluation Platform

## Overview

AI Judge is a full-stack evaluation platform for annotation queues. Users import submissions, create AI judges (rubrics + models), assign judges to question templates, run real LLM evaluations, and review results with filters, statistics, and charts.  
The app persists operational state in Supabase and executes provider calls through a server-side API route for safer key handling and centralized error control.

## Live Demo
https://v0-besimplejudge.vercel.app/submissions

Go to Settings → enter your LLM API keys → upload submissions → start evaluating.

## Tech Stack

- Frontend: React 19 + TypeScript + Tailwind + shadcn/ui
- Runtime: Next.js (App Router shell)
- Backend: Supabase Postgres + Storage + RLS policies
- LLMs/APIs: OpenAI/OpenVision + Anthropic (+ optional Google path)
- Validation + reliability: Zod, typed hooks, retry/backoff logic, timeout guards
- Visualization/export: Recharts + CSV export

## Brief Design Overview

- `Submissions` are normalized into `submissions`, `questions`, and `answers`.
- `Judges` are stored in `judges`; per-queue/per-template mapping is in `judge_assignments`.
- `Run AI Judges` builds `(submission x question x assigned judge)` tasks in `useEvaluations`.
- Tasks call `POST /api/evaluate`, which reads provider keys from Supabase settings (with env fallback), applies timeout/error handling, then returns normalized `{ verdict, reasoning, tokensUsed }`.
- Results are persisted in `evaluations` and rendered in the Results page with client-side filters/sorts.
- Attachments are stored in Supabase Storage and references are kept on `submissions.attachments` JSONB; supported providers receive multimodal payloads.


**Architecture** **Decisions**:
Supabase as backend: fast relational modeling for queue/judge/evaluation joins, easy hosted Postgres, and Storage for attachments in one stack.
Next.js API route for LLM calls: keeps provider secret handling server-side, centralizes retries/timeouts/parsing, and avoids exposing raw provider integration in UI components.
Hook-driven data orchestration: logic lives in useSubmissions, useJudges, useEvaluations, useSettings to keep views mostly declarative and composable.
shadcn/ui + Tailwind: rapid feature delivery with consistent primitives, good dark-mode ergonomics, and low styling overhead.

**Trade-offs:**
- No auth (intentional for take-home scope): RLS is permissive for speed; production would require auth-based policies and per-tenant isolation.
- Client-side filtering/sorting on Results: simpler UX and implementation for moderate data size; large-scale workloads should move filtering/pagination server-side.
- Attachment handling: current model stores attachment metadata in submissions.attachments JSONB for implementation speed; dedicated relational attachment tables can improve querying/governance.
- Retry/timeout tuning: conservative defaults favor reliability and cost control over maximum throughput.
- - UI/UX consistency: Some UI elements (e.g., judge assignment drawer) could benefit 
  from further polish. Priority was placed on functional completeness over 
  pixel-perfect uniformity.
- Component size: Most components are small and focused with shared primitives. 
  A few view-level components remain larger than ideal due to complex interaction 
  flows — would benefit from further decomposition in production.


**Bonus Features Implemented**
Animated charts in Results
Prompt field selector (question/answer/metadata inclusion)
Judge templates
CSV export
Cost/time estimation modal
Comparison view for judge outputs
Dark mode
Real-time run progress panel
Attachment upload + multimodal forwarding path

**Time Spent**
5 hours





## Setup

### 1) Clone and install

```bash
git clone <your-repo-url>
cd ai-judge
pnpm install

2) Configure environment
Copy .env.example to .env.local and fill required values:

cp .env.example .env.local

3) Supabase setup
Run your base schema SQL for:
* submissions, questions, answers, judges, judge_assignments, evaluations, settings
Then run attachment SQL from:
* db/phase7_attachments.sql
Create Storage bucket(s):
* attachments (for submission attachments)

4) Start dev server
pnpm dev
Open http://localhost:3000.


