# AI Judge — LLM Evaluation Platform

## Overview

AI Judge is a full-stack evaluation platform for annotation queues. Users import submissions, create AI judges with custom rubrics, assign judges to question templates, run real LLM evaluations, and review results with filters, statistics, and charts.

The app persists all data in Supabase and routes LLM calls through a server-side API route for secure key handling and centralized error control.

## Live Demo

**https://v0-besimplejudge.vercel.app/submissions**

Go to Settings → enter your LLM API keys → upload submissions → start evaluating.

## Tech Stack

- **Frontend:** React 19, TypeScript (strict, zero `any`), Tailwind CSS, shadcn/ui
- **Runtime:** Next.js (App Router)
- **Backend:** Supabase Postgres, Supabase Storage, RLS policies
- **LLM Providers:** OpenAI (including vision), Anthropic, Google (optional)
- **Validation:** Zod for request/response validation, typed hooks throughout
- **Reliability:** Retry with exponential backoff, timeout guards, concurrency limiting
- **Visualization:** Recharts (animated charts), CSV export

## Architecture

### Data Flow

1. **Submissions** are uploaded as JSON and normalized into `submissions`, `questions`, and `answers` tables.
2. **Judges** are stored in `judges`; per-queue/per-template assignments live in `judge_assignments` with configurable prompt fields.
3. **Run AI Judges** builds `(submission × question × assigned judge)` evaluation tasks in `useEvaluations`.
4. Each task calls `POST /api/evaluate`, which reads provider keys from the Supabase `settings` table (with `process.env` fallback), applies timeout/error handling, and returns `{ verdict, reasoning, tokensUsed }`.
5. **Results** are persisted in `evaluations` and rendered with client-side filters, sorting, and aggregate statistics.
6. **Attachments** are stored in Supabase Storage; references are kept in `submissions.attachments` JSONB. Supported providers receive multimodal payloads (images via base64, PDFs via text extraction or native document support).

### Key Decisions

- **Supabase as backend:** Relational modeling fits the domain well — queues, judges, assignments, and evaluations have natural foreign key relationships. Supabase provides Postgres, Storage, and RLS in one stack.
- **Next.js API route for LLM calls:** Keeps API keys server-side, centralizes retry/timeout/parsing logic, and avoids exposing provider SDKs in the browser.
- **Hook-driven data layer:** All data logic lives in `useSubmissions`, `useJudges`, `useEvaluations`, `useSettings` — views stay declarative and composable.
- **shadcn/ui + Tailwind:** Rapid delivery with consistent design primitives, built-in dark mode support, and minimal custom CSS.

## Trade-offs

- **No authentication:** RLS policies are permissive for take-home scope. Production would add Supabase Auth with per-tenant row-level isolation.
- **Client-side filtering/sorting on Results:** Simpler implementation for moderate data volumes. At scale, filtering and pagination would move server-side with aggregate query endpoints.
- **Attachment storage:** Metadata stored as JSONB on `submissions` for implementation speed. A dedicated `submission_attachments` table would improve querying and governance.
- **Component granularity:** `useEvaluations` and `QueueDetailPage` handle complex orchestration flows and are larger than ideal. In production, these would be decomposed further (e.g., extracting `useResults` from `useEvaluations`, separating the progress panel into its own component).
- **UI/UX consistency:** Some UI elements (e.g., judge assignment drawer) could benefit from further visual polish. Priority was placed on functional completeness over pixel-perfect uniformity.
- **Retry/timeout tuning:** Conservative defaults (30s timeout, 3 retries with 2/4/8s backoff) favor reliability over throughput.

## Bonus Features

- Animated charts (pass rate by judge, verdict distribution donut)
- Prompt field selector (choose which fields go into the evaluation prompt)
- Judge templates (5 pre-built rubrics for common evaluation types)
- CSV export of filtered results
- Cost/time estimation modal before running evaluations
- Side-by-side comparison view for disagreeing judges
- Dark mode
- Real-time evaluation progress panel with per-task status
- File attachment upload with multimodal forwarding (images + PDFs to vision-capable models)

## Time Spent

5 hours

## Setup

### 1. Clone and install

```bash
git clone https://github.com/AdityaSharma2168/BeSimpleTakeHomeAdi.git
cd BeSimpleTakeHomeAdi
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-...        # optional if using Settings page
ANTHROPIC_API_KEY=sk-ant-... # optional if using Settings page
GOOGLE_API_KEY=...           # optional
```

### 3. Supabase setup

- Create a Supabase project
- Run the base schema SQL (creates `submissions`, `questions`, `answers`, `judges`, `judge_assignments`, `evaluations`, `settings` tables)
- Run `db/phase7_attachments.sql` for attachment support
- Create a public Storage bucket named `attachments`

### 4. Start dev server

```bash
pnpm dev
```

Open http://localhost:3000
