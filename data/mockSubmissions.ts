import type { Submission } from '@/lib/types';

export const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: 'sub_1',
    queueId: 'queue_1',
    questionCount: 2,
    answerCount: 2,
    submittedAt: '2024-07-22T10:00:00Z',
    status: 'evaluated',
    questions: [
      {
        templateId: 'q_template_1',
        questionText: 'Is the sky blue?',
        answer: 'Yes',
        answerReasoning: 'The sky appears blue due to Rayleigh scattering of sunlight.',
      },
      {
        templateId: 'q_template_2',
        questionText: 'Describe the weather conditions.',
        answer: 'Sunny with mild temperatures',
        answerReasoning: 'Clear skies and moderate humidity suggest pleasant weather.',
      },
    ],
  },
  {
    id: 'sub_2',
    queueId: 'queue_1',
    questionCount: 2,
    answerCount: 2,
    submittedAt: '2024-07-22T11:00:00Z',
    status: 'evaluated',
    questions: [
      {
        templateId: 'q_template_1',
        questionText: 'Is the sky blue?',
        answer: 'No',
        answerReasoning: 'On overcast days, the sky appears gray.',
      },
      {
        templateId: 'q_template_2',
        questionText: 'Describe the weather conditions.',
        answer: 'Cloudy with rain',
        answerReasoning: 'Dark clouds and precipitation expected.',
      },
    ],
  },
  {
    id: 'sub_3',
    queueId: 'queue_1',
    questionCount: 1,
    answerCount: 1,
    submittedAt: '2024-07-22T12:00:00Z',
    status: 'evaluated',
    questions: [
      {
        templateId: 'q_template_1',
        questionText: 'Is the sky blue?',
        answer: 'Yes, but with caveats',
        answerReasoning: 'The sky is blue under normal atmospheric conditions.',
      },
    ],
  },
  {
    id: 'sub_4',
    queueId: 'queue_1',
    questionCount: 1,
    answerCount: 1,
    submittedAt: '2024-07-22T13:00:00Z',
    status: 'pending',
    questions: [
      {
        templateId: 'q_template_1',
        questionText: 'Is the sky blue?',
        answer: 'Yes',
        answerReasoning: 'Blue wavelengths scatter more.',
      },
    ],
  },
  {
    id: 'sub_5',
    queueId: 'queue_1',
    questionCount: 1,
    answerCount: 1,
    submittedAt: '2024-07-22T14:00:00Z',
    status: 'pending',
    questions: [
      {
        templateId: 'q_template_1',
        questionText: 'What is the boiling point of water?',
        answer: '100 degrees Celsius',
        answerReasoning: 'At standard atmospheric pressure.',
      },
    ],
  },
  {
    id: 'sub_6',
    queueId: 'queue_2',
    questionCount: 1,
    answerCount: 1,
    submittedAt: '2024-07-23T09:00:00Z',
    status: 'evaluated',
    questions: [
      {
        templateId: 'q_template_4',
        questionText: 'Is recycling effective at reducing waste?',
        answer: 'Yes',
        answerReasoning: 'Recycling reduces landfill waste and conserves resources.',
      },
    ],
  },
  {
    id: 'sub_7',
    queueId: 'queue_1',
    questionCount: 1,
    answerCount: 1,
    submittedAt: '2024-07-22T15:00:00Z',
    status: 'pending',
    questions: [
      {
        templateId: 'q_template_1',
        questionText: 'Is the sky blue?',
        answer: 'Yes',
        answerReasoning: 'Simple observation confirms this.',
      },
    ],
  },
  {
    id: 'sub_8',
    queueId: 'queue_1',
    questionCount: 1,
    answerCount: 1,
    submittedAt: '2024-07-22T16:00:00Z',
    status: 'pending',
    questions: [
      {
        templateId: 'q_template_2',
        questionText: 'Describe the weather conditions.',
        answer: 'Temperature is 22C',
        answerReasoning: 'Only temperature mentioned.',
      },
    ],
  },
];

export const MOCK_EVAL_LOG = [
  { submissionId: 'sub_1', templateId: 'q_template_1', judgeName: 'Factual Accuracy', verdict: 'pass' as const, latency: 1200 },
  { submissionId: 'sub_1', templateId: 'q_template_1', judgeName: 'Reasoning Quality', verdict: 'pass' as const, latency: 890 },
  { submissionId: 'sub_1', templateId: 'q_template_2', judgeName: 'Factual Accuracy', verdict: 'fail' as const, latency: 1450 },
  { submissionId: 'sub_2', templateId: 'q_template_1', judgeName: 'Factual Accuracy', verdict: 'pass' as const, latency: 1100 },
  { submissionId: 'sub_2', templateId: 'q_template_1', judgeName: 'Reasoning Quality', verdict: 'inconclusive' as const, latency: 2100 },
  { submissionId: 'sub_2', templateId: 'q_template_2', judgeName: 'Factual Accuracy', verdict: 'pass' as const, latency: 950 },
  { submissionId: 'sub_3', templateId: 'q_template_1', judgeName: 'Factual Accuracy', verdict: 'fail' as const, latency: 1300 },
  { submissionId: 'sub_3', templateId: 'q_template_1', judgeName: 'Reasoning Quality', verdict: 'pass' as const, latency: 1050 },
];

export const QUESTION_TEMPLATES: Record<string, string> = {
  q_template_1: 'Is the sky blue?',
  q_template_2: 'Describe the weather conditions.',
  q_template_3: 'What is the boiling point of water?',
  q_template_4: 'Is recycling effective at reducing waste?',
};
