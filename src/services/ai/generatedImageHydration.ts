const MAX_IMAGE_JOBS_PER_ACTION = 10;
const IMAGE_PLACEHOLDER = `https://placehold.co/600x400?text=${encodeURIComponent('Đang tạo ảnh')}`;

export interface GeneratedImageJob {
  questionIndex: number;
  prompt: string;
}

export interface PreparedGeneratedImages<TQuiz> {
  quiz: TQuiz;
  jobs: GeneratedImageJob[];
}

export interface HydrateGeneratedImagesOptions {
  concurrency: number;
  signal?: AbortSignal;
  generate: (prompt: string) => Promise<string | null>;
  onResolved: (questionIndex: number, image: string) => void;
}

export function prepareGeneratedImageJobs<
  TQuiz extends { questions?: Array<Record<string, unknown>> },
>(source: TQuiz): PreparedGeneratedImages<TQuiz> {
  const quiz = structuredClone(source);
  const jobs: GeneratedImageJob[] = [];

  (quiz.questions ?? []).forEach((question, questionIndex) => {
    if (question.type !== 'IMAGE_QUESTION') return;
    if (typeof question.image !== 'string' || !question.image.startsWith('IMAGE_PROMPT:')) return;

    const prompt = question.image.slice('IMAGE_PROMPT:'.length).trim();
    question.image = IMAGE_PLACEHOLDER;
    if (prompt && jobs.length < MAX_IMAGE_JOBS_PER_ACTION) {
      jobs.push({ questionIndex, prompt });
    }
  });

  return { quiz, jobs };
}

export async function hydrateGeneratedImages(
  jobs: GeneratedImageJob[],
  options: HydrateGeneratedImagesOptions,
): Promise<void> {
  if (jobs.length === 0) return;

  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < jobs.length && !options.signal?.aborted) {
      const job = jobs[cursor];
      cursor += 1;
      try {
        const image = await options.generate(job.prompt);
        if (image && !options.signal?.aborted) {
          options.onResolved(job.questionIndex, image);
        }
      } catch {
        // Keep the placeholder and continue hydrating the remaining images.
      }
    }
  };

  const workerCount = Math.min(Math.max(1, options.concurrency), jobs.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

export { IMAGE_PLACEHOLDER, MAX_IMAGE_JOBS_PER_ACTION };
