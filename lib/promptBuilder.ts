export function buildEvaluationPrompt(
  question: { questionText: string; questionType?: string },
  answer: { choice?: string; reasoning?: string },
  submission: { subjectMetadata?: Record<string, unknown> } | undefined,
  promptConfig: {
    includeQuestionText: boolean;
    includeAnswerChoice: boolean;
    includeAnswerReasoning: boolean;
    includeQuestionType: boolean;
    includeSubmissionMetadata: boolean;
  }
): string {
  const parts: string[] = [];
  if (promptConfig.includeSubmissionMetadata && submission?.subjectMetadata) {
    parts.push(`Subject metadata: ${JSON.stringify(submission.subjectMetadata)}`);
  }
  if (promptConfig.includeQuestionText) parts.push(`Question: ${question.questionText}`);
  if (promptConfig.includeQuestionType && question.questionType) parts.push(`Question Type: ${question.questionType}`);
  if (promptConfig.includeAnswerChoice && answer.choice) parts.push(`Answer: ${answer.choice}`);
  if (promptConfig.includeAnswerReasoning && answer.reasoning) parts.push(`Reasoning provided: ${answer.reasoning}`);
  return parts.join('\n');
}

