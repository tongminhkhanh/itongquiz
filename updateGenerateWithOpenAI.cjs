const fs = require('fs');
const filePath = 'c:/itongquiz1/itongquiz1/src/services/geminiService.ts';

let content = fs.readFileSync(filePath, 'utf8');

// Update generateWithOpenAI signature
content = content.replace(
  `const generateWithOpenAI = async (
  promptText: string,
  apiKey: string,
  file?: File | null,
  imageLibrary?: Array<{ id: string; name: string; data?: string; }>,
  baseUrl: string = 'https://api.openai.com/v1'
): Promise<any> => {`,
  `const generateWithOpenAI = async (
  promptText: string,
  apiKey: string,
  file?: File | null,
  imageLibrary?: Array<{ id: string; name: string; data?: string; }>,
  baseUrl: string = 'https://api.openai.com/v1',
  onStepChange?: (step: 'generating' | 'reviewing') => void
): Promise<any> => {`
);

// Update internal resolve of generateWithOpenAI
content = content.replace(
  `const parsedQuiz = validateAndFixQuiz(parseAndRepairJSON(formattedText));

    // Map image IDs to data URLs if imageLibrary is provided
    if (imageLibrary && imageLibrary.length > 0 && parsedQuiz.questions) {
      parsedQuiz.questions = parsedQuiz.questions.map((q: any) => {`,
  `const parsedQuiz = validateAndFixQuiz(parseAndRepairJSON(formattedText));

    if (onStepChange) onStepChange('reviewing');
    const reviewedQuiz = await validateQuizWithAI(parsedQuiz, apiKey);

    // Map image IDs to data URLs if imageLibrary is provided
    if (imageLibrary && imageLibrary.length > 0 && reviewedQuiz.questions) {
      reviewedQuiz.questions = reviewedQuiz.questions.map((q: any) => {`
);

// Replace returned parsedQuiz
content = content.replace(
  `return parsedQuiz;`,
  `return reviewedQuiz;`
);

// Update the calls in generateQuiz
content = content.replace(
  `result = await generateWithOpenAI(promptText, apiKey, file, options?.imageLibrary, baseUrl);`,
  `result = await generateWithOpenAI(promptText, apiKey, file, options?.imageLibrary, baseUrl, onStepChange);`
);

content = content.replace(
  `result = await generateWithOpenAI(promptText, apiKey, file, options?.imageLibrary);`,
  `result = await generateWithOpenAI(promptText, apiKey, file, options?.imageLibrary, undefined, onStepChange);`
);

content = content.replace(
  `result = await generateWithOpenAI(promptText, apiKey, file, options?.imageLibrary, baseUrl);`,
  `result = await generateWithOpenAI(promptText, apiKey, file, options?.imageLibrary, baseUrl, onStepChange);`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated generateWithOpenAI and generateQuiz calls');
