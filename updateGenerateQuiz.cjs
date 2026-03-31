const fs = require('fs');
const filePath = 'c:/itongquiz1/itongquiz1/src/services/geminiService.ts';

let content = fs.readFileSync(filePath, 'utf8');

// Update generateWithGemini signature
content = content.replace(
  `const generateWithGemini = async (
  promptText: string,
  apiKey: string,
  file?: File | null,
  imageLibrary?: Array<{ id: string; name: string; data?: string; }>
): Promise<any> => {`,
  `const generateWithGemini = async (
  promptText: string,
  apiKey: string,
  file?: File | null,
  imageLibrary?: Array<{ id: string; name: string; data?: string; }>,
  onStepChange?: (step: 'generating' | 'reviewing') => void
): Promise<any> => {`
);

// Update internal resolve to call onStepChange
content = content.replace(
  `const quizData = validateAndFixQuiz(parseAndRepairJSON(formattedText));
      return quizData; // Trả về quizData trực tiếp`,
  `const quizData = validateAndFixQuiz(parseAndRepairJSON(formattedText));
      if (onStepChange) onStepChange('reviewing');
      return await validateQuizWithAI(quizData, apiKey);`
);

// Update generateQuiz signature
content = content.replace(
  `export const generateQuiz = async (
  topic: string,
  classLevel: string,
  content: string,
  file?: File | null,
  options?: QuizGenerationOptions,
  customApiKey?: string,
  provider: AIProvider = 'localhost' // Default to Localhost AIcliproxy
): Promise<any> => {`,
  `export const generateQuiz = async (
  topic: string,
  classLevel: string,
  content: string,
  file?: File | null,
  options?: QuizGenerationOptions,
  customApiKey?: string,
  provider: AIProvider = 'localhost',
  onStepChange?: (step: 'generating' | 'reviewing') => void
): Promise<any> => {`
);

// Update generateQuiz call
content = content.replace(
  `result = await generateWithGemini(promptText, apiKey, file, options?.imageLibrary);`,
  `result = await generateWithGemini(promptText, apiKey, file, options?.imageLibrary, onStepChange);`
);

// The user is actually using API Proxy (localhost:3000), which hits generateWithOpenAI for localhost provider!
// This is EXTREMELY IMPORTANT: "tôi chạy tạo để bằng AIClient qua localhost/3000 vậy có phải sửa gì nhiều ko"
// The AIClient is essentially the "localhost" provider under the hood, traversing 'generateWithOpenAI'.
// Wait. By default, localhost uses `generateWithOpenAI`. Let's check generateWithOpenAI. It also needs the validation chain.
// Let's modify generateWithOpenAI and others too!

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done replacement in geminiService.ts');
