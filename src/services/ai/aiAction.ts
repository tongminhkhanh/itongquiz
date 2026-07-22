export type AiWorkflow = 'QUIZ_CREATE' | 'QUESTION_REGENERATE' | 'GENERIC';
export type AiStage = 'OCR' | 'GENERATE' | 'REVIEW' | 'REPAIR' | 'REGENERATE' | 'GENERIC';

export interface ClientAiAction {
  actionId: string;
  workflow: AiWorkflow;
}

export interface AiActionMeta extends ClientAiAction {
  stage: AiStage;
}

export interface AiActionOptions {
  action?: AiActionMeta;
  actionId?: string;
  workflow?: AiWorkflow;
  stage?: AiStage;
}

export const createAiActionId = (): string => `ai-${crypto.randomUUID()}`;

export const createAiAction = (workflow: AiWorkflow): ClientAiAction => ({
  actionId: createAiActionId(),
  workflow,
});

const workflowForStage = (stage: AiStage): AiWorkflow => {
  if (stage === 'REGENERATE') return 'QUESTION_REGENERATE';
  if (stage === 'GENERIC') return 'GENERIC';
  return 'QUIZ_CREATE';
};

const defaultStageForWorkflow = (workflow: AiWorkflow): AiStage => {
  if (workflow === 'QUESTION_REGENERATE') return 'REGENERATE';
  if (workflow === 'GENERIC') return 'GENERIC';
  return 'GENERATE';
};

export const resolveAiActionMeta = (options: AiActionOptions = {}): AiActionMeta => {
  if (options.action) {
    return {
      actionId: options.action.actionId.trim(),
      workflow: options.action.workflow,
      stage: options.action.stage,
    };
  }

  const workflow = options.workflow
    ?? (options.stage ? workflowForStage(options.stage) : 'GENERIC');
  const stage = options.stage ?? defaultStageForWorkflow(workflow);

  return {
    actionId: options.actionId?.trim() || createAiActionId(),
    workflow,
    stage,
  };
};
