import type { Judge, JudgeTemplate } from '@/lib/types';

export const MOCK_JUDGES: Judge[] = [
  { 
    id: 'judge_1', 
    name: 'Factual Accuracy', 
    system_prompt: 'Evaluate whether the answer is factually correct based on the question asked. Consider only objective accuracy, not style or completeness.', 
    model_name: 'gpt-4o', 
    provider: 'openai', 
    active: true, 
    created_at: '2024-07-20T10:00:00Z' 
  },
  { 
    id: 'judge_2', 
    name: 'Reasoning Quality', 
    system_prompt: 'Assess the quality and logical coherence of the reasoning provided. Look for clear logical steps, sound argumentation, and absence of logical fallacies.', 
    model_name: 'claude-sonnet-4-20250514', 
    provider: 'anthropic', 
    active: true, 
    created_at: '2024-07-20T11:00:00Z' 
  },
  { 
    id: 'judge_3', 
    name: 'Clean', 
    system_prompt: 'Judge whether the answer fully addresses all aspects of the question. Flag partial or incomplete responses.', 
    model_name: 'gpt-4o-mini', 
    provider: 'openai', 
    active: true, 
    created_at: '2024-07-21T09:00:00Z' 
  },
  { 
    id: 'judge_4', 
    name: 'Conciseness', 
    system_prompt: 'Evaluate whether the answer is appropriately concise without unnecessary verbosity while still being complete.', 
    model_name: 'gemini-1.5-flash', 
    provider: 'google', 
    active: false, 
    created_at: '2024-07-19T14:00:00Z' 
  },
  { 
    id: 'judge_5', 
    name: 'Consistency', 
    system_prompt: 'Check whether the answer choice and the reasoning provided are internally consistent and non-contradictory.', 
    model_name: 'gemini-1.5-pro', 
    provider: 'google', 
    active: true, 
    created_at: '2024-07-21T16:00:00Z' 
  },
];

export const JUDGE_TEMPLATES: JudgeTemplate[] = [
  {
    name: 'Factual Accuracy',
    prompt: "Evaluate whether the answer is factually correct based on the question asked. Consider only objective accuracy, not style or completeness. If the answer contains any factual errors, verdict should be 'fail'. If accuracy cannot be determined, use 'inconclusive'.",
    model: 'gpt-4o',
    provider: 'openai',
  },
  {
    name: 'Reasoning Quality',
    prompt: 'Assess the quality and logical coherence of the reasoning provided. Look for clear logical steps, sound argumentation, and absence of logical fallacies. A response with no reasoning or circular reasoning should fail.',
    model: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
  },
  {
    name: 'Clean',
    prompt: "Judge whether the answer fully addresses all aspects of the question. Flag partial or incomplete responses as 'fail'. If the question has multiple parts, all must be addressed to pass.",
    model: 'gpt-4o-mini',
    provider: 'openai',
  },
  {
    name: 'Conciseness',
    prompt: "Evaluate whether the answer is appropriately concise without unnecessary verbosity while still being complete. Excessive filler or redundant information should result in 'fail'.",
    model: 'gemini-1.5-flash',
    provider: 'google',
  },
  {
    name: 'Consistency',
    prompt: 'Check whether the answer choice and the reasoning provided are internally consistent and non-contradictory. If the reasoning argues for one answer but a different answer was selected, this should fail.',
    model: 'gemini-1.5-pro',
    provider: 'google',
  },
];

export const MODELS_BY_PROVIDER: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini'],
  anthropic: ['claude-sonnet-4-20250514'],
  google: ['gemini-1.5-pro', 'gemini-1.5-flash'],
};
