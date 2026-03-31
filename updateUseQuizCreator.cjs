const fs = require('fs');
const filePath = 'c:/itongquiz1/itongquiz1/src/hooks/useQuizCreator.ts';

let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  `    // UI state
    isGenerating: boolean;
    error: string | null;`,
  `    // UI state
    isGenerating: boolean;
    generationStep: 'idle' | 'generating' | 'reviewing' | 'completed';
    error: string | null;`
);

content = content.replace(
  `    // UI state
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);`,
  `    // UI state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStep, setGenerationStep] = useState<'idle' | 'generating' | 'reviewing' | 'completed'>('idle');
    const [error, setError] = useState<string | null>(null);`
);

content = content.replace(
  `        setGeneratedQuiz(null);
        setError(null);`,
  `        setGeneratedQuiz(null);
        setGenerationStep('idle');
        setError(null);`
);

content = content.replace(
  `        setIsGenerating(true);
        setError(null);`,
  `        setIsGenerating(true);
        setGenerationStep('generating');
        setError(null);`
);

content = content.replace(
  `            const result = await generateQuiz(
                topic,
                classLevel,
                content,
                attachedFiles[0] || null,
                options,
                undefined,
                aiProvider
            );`,
  `            const result = await generateQuiz(
                topic,
                classLevel,
                content,
                attachedFiles[0] || null,
                options,
                undefined,
                aiProvider,
                (step) => setGenerationStep(step)
            );`
);

content = content.replace(
  `            setGeneratedQuiz(normalizedQuiz);
        } catch (err: any) {
            console.error('Quiz generation error:', err);
            setError(err.message || 'Đã xảy ra lỗi khi tạo đề.');
        } finally {`,
  `            setGeneratedQuiz(normalizedQuiz);
            setGenerationStep('completed');
        } catch (err: any) {
            console.error('Quiz generation error:', err);
            setError(err.message || 'Đã xảy ra lỗi khi tạo đề.');
            setGenerationStep('idle');
        } finally {`
);

content = content.replace(
  `        generatedQuiz,
        isGenerating,
        error,`,
  `        generatedQuiz,
        isGenerating,
        generationStep,
        error,`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated useQuizCreator.ts');
