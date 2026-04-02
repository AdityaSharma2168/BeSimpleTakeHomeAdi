import type { Queue } from '@/lib/types';

export const MOCK_QUEUES: Queue[] = [
  { id: 'queue_1', submissionCount: 8, templates: ['q_template_1', 'q_template_2'], lastSubmitted: '2024-07-22' },
  { id: 'queue_2', submissionCount: 14, templates: ['q_template_1', 'q_template_3', 'q_template_4'], lastSubmitted: '2024-07-23' },
  { id: 'queue_3', submissionCount: 5, templates: ['q_template_2'], lastSubmitted: '2024-07-21' },
];
