export type Verdict = 'pass' | 'fail' | 'inconclusive';

export type Provider = 'openai' | 'anthropic' | 'google';

export interface Queue {
  id: string;
  submissionCount: number;
  templates: string[];
  lastSubmitted: string;
}

export interface Submission {
  id: string;
  queueId: string;
  questionCount: number;
  answerCount: number;
  submittedAt: string;
  status: 'pending' | 'evaluated';
  questions: SubmissionQuestion[];
  subjectMetadata?: Record<string, unknown>;
  attachments?: SubmissionAttachment[];
}

export interface SubmissionQuestion {
  templateId: string;
  questionText: string;
  answer: string;
  answerReasoning: string;
}

export interface SubmissionAttachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

export interface Judge {
  id: string;
  name: string;
  system_prompt: string;
  model_name: string;
  provider: Provider;
  active: boolean;
  created_at: string;
}

export interface JudgeTemplate {
  name: string;
  prompt: string;
  model: string;
  provider: Provider;
}

export interface Evaluation {
  id: string;
  submission_id: string;
  question_template_id: string;
  question_text: string;
  judge_id: string;
  judge_name: string;
  judge_model: string;
  judge_provider: Provider;
  verdict: Verdict;
  reasoning: string;
  tokens_used: number;
  latency_ms: number;
  created_at: string;
  answer?: string;
}

export interface EvalLogEntry {
  submissionId: string;
  templateId: string;
  judgeName: string;
  verdict: Verdict;
  latency: number;
}

export interface JudgeAssignment {
  templateId: string;
  judgeIds: string[];
  includeQuestionText: boolean;
  includeAnswerChoice: boolean;
  includeAnswerReasoning: boolean;
  includeQuestionType: boolean;
  includeSubmissionMetadata: boolean;
}

export interface FilterOption {
  value: string;
  label: string;
  dotColor?: string;
}
