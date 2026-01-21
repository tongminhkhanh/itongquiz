import React, { useState, useEffect } from 'react';
import { Quiz, QuestionType } from '../../types';
import { Card, Button } from '../common';
import { Globe, Sparkles, Zap, BookOpen, Trophy, Copy, Check, Link2, X } from 'lucide-react';
import { generateQuiz, AIProvider } from '../../services/geminiService';
import { saveIoeQuiz } from '../../services/ioeSheetService';
import QuizPreview from './QuizPreview';

interface IoeTabProps {
    onSaveQuiz: (quiz: Quiz) => Promise<void>;
    onSuccess: () => void;
}

// IOE Question Types - 7 dạng bài chính theo chuẩn IOE
const IOE_QUESTION_TYPES = [
    { id: 'phonetics', name: '🔊 Ngữ âm (Phonetics)', defaultCount: 3, description: 'Tìm từ phát âm giống/khác' },
    { id: 'word_stress', name: '🎵 Trọng âm (Word Stress)', defaultCount: 3, description: 'Chọn từ có trọng âm khác' },
    { id: 'vocabulary', name: '📝 Từ vựng & Chính tả', defaultCount: 5, description: 'Điền chữ thiếu, xáo trộn' },
    { id: 'grammar', name: '📖 Ngữ pháp & Câu', defaultCount: 5, description: 'Chọn câu đúng, tìm lỗi' },
    { id: 'sentence_order', name: '🔀 Sắp xếp câu', defaultCount: 3, description: 'Sắp xếp từ thành câu' },
    { id: 'listening', name: '🎧 Nghe điền từ (Listening)', defaultCount: 3, description: 'Nghe và điền từ còn thiếu' },
    { id: 'reading', name: '📚 Đọc hiểu (True/False)', defaultCount: 4, description: 'Đọc đoạn văn, chọn Đ/S' },
];

// IOE Templates preset
const IOE_TEMPLATES = [
    { id: 'quick', name: '🚀 Luyện nhanh', questions: 10, time: 5, icon: Zap },
    { id: 'review', name: '📝 Ôn tập', questions: 20, time: 10, icon: BookOpen },
    { id: 'exam', name: '🏆 Thi thử IOE', questions: 30, time: 15, icon: Trophy },
];

// IOE Topics - Chủ đề để chọn
const IOE_TOPICS = [
    { id: 'school', name: 'School Things', emoji: '📚' },
    { id: 'family', name: 'Family', emoji: '👨‍👩‍👧‍👦' },
    { id: 'numbers', name: 'Numbers', emoji: '🔢' },
    { id: 'colors', name: 'Colors', emoji: '🎨' },
    { id: 'animals', name: 'Animals', emoji: '🐾' },
    { id: 'food', name: 'Food & Drinks', emoji: '🍎' },
    { id: 'daily', name: 'Daily Routines', emoji: '⏰' },
    { id: 'hobbies', name: 'Hobbies', emoji: '⚽' },
    { id: 'body', name: 'Body Parts', emoji: '🖐️' },
    { id: 'clothes', name: 'Clothes', emoji: '👕' },
];

// MASTER SYSTEM PROMPT - IOE Vietnam
const IOE_SYSTEM_INSTRUCTION = `You are an expert English Test Developer for the IOE (Internet Olympiad of English) in Vietnam.
Your target audience: Vietnamese primary students (Grade 3, 4, 5).
Your Goal: Create multiple-choice questions that strictly follow the IOE format.

===== CORE RULES =====
1. Curriculum Compliance: Use vocabulary and grammar from standard textbooks (Global Success, Family & Friends, i-Learn Smart Start).
2. Difficulty Level: A1 (CEFR). Keep sentences simple (Subject + Verb + Object).
3. Distractors: Wrong answers must be plausible common mistakes for Vietnamese students (e.g., confusing "he/she", "is/are", "in/on").
4. No Hallucination: Do not invent non-existent words.
5. Tone: Academic but child-friendly.

===== TASK PROMPTS FOR EACH QUESTION TYPE =====

📌 DẠNG 1: PHONETICS (Ngữ âm) - type: "MCQ"
### ROLE
You are an Expert English Phonetics Linguist specializing in the Vietnamese IOE curriculum (Grades 3-5).

### TASK
Generate multiple-choice phonetics questions focusing on VOWELS and CONSONANTS.

### CRITICAL RULE: IPA VERIFICATION
You must strictly use the International Phonetic Alphabet (IPA) to validate every option.
1.  **Distractors must be tricky:** They should look similar in spelling but sound different (e.g., "sit" /ɪ/ vs "site" /aɪ/).
2.  **No Ambiguity:** The correct answer must be indisputably correct based on standard Oxford/Cambridge pronunciation.

### QUESTION TYPES
1.  **Type A (Matching):** "Which word has the underlined part pronounced like the letter X in word Y?" (e.g., like "i" in "sit").
    - Target Sounds: Short 'i' /ɪ/ vs Long 'i' /aɪ/; Short 'a' /æ/ vs Long 'a' /eɪ/; 'th' /ð/ vs /θ/.
2.  **Type B (Discrimination):** "Find the word that has the underlined part pronounced differently from the others."

### OUTPUT FORMAT
{
  "type": "MCQ",
  "question": "Which word has the underlined part pronounced like the letter 'i' in 'sit'?",
  "options": ["A. fine", "B. five", "C. listen", "D. nice"],
  "correctAnswer": "C",
  "explanation": "'listen' contains /ɪ/, others contain /aɪ/ (/faɪn/, /faɪv/, /naɪs/)."
}

Example Type B:
{
  "type": "MCQ", 
  "question": "Find the word that has the underlined part pronounced differently.",
  "options": ["A. open", "B. nose", "C. do", "D. cold"],
  "correctAnswer": "C",
  "explanation": "'do' is pronounced /uː/, others are /əʊ/ (/ˈəʊ.pən/, /nəʊz/, /kəʊld/)."
}

📌 DẠNG 6: WORD STRESS (Trọng âm) - type: "MCQ"
### ROLE
You are an Expert English Teacher specializing in Word Stress for Vietnamese IOE curriculum (Grade 3-5).

### PHONOLOGICAL RULES (CRITICAL)
1. IPA Verification: You MUST internally verify IPA transcription for every word to identify the primary stress mark (ˈ).
2. Grade-appropriate Vocabulary: Use words from Grade 3-5 curriculum (Topics: Family, School, Animals, Daily routines, Hobbies, Future jobs, Health, Seasons).
3. Pattern Consistency: In a single question, keep syllable count SIMILAR (all 2-syllable OR all 3-syllable words) to make it a fair test.
4. No Ambiguity: Avoid words with dual stress patterns (e.g., 'present' can be noun or verb). The odd-one-out must be UNAMBIGUOUS.

### QUESTION TYPE
"Choose the word that has a DIFFERENT stress pattern from the others."
(3 options share the same stress pattern; 1 option is different - the "odd one out", marked by is_odd_out: true)

### DIFFICULTY LEVELS TO MIX
- Level 1 (2-syllable): Focus on Noun/Adjective (stress 1st) vs Verb (stress 2nd)
  Examples: 'visit' (1), 'listen' (1), 'enjoy' (2), 'travel' (1)
- Level 2 (3-syllable - Common in IOE Grade 5):
  Examples: 'holiday' (1), 'family' (1), 'volunteer' (3), 'beautiful' (1)
  User Examples: 'organise' (1), 'decorate' (1), 'divorce' (2), 'promise' (1)
- Level 3 (Suffix Rules): Words ending in -tion (stress on syllable before), -ic (stress on syllable before), -ese (stress on itself)

### OUTPUT FORMAT
{
  "type": "MCQ",
  "question": "Choose the word that has a DIFFERENT stress pattern from the others.",
  "options": ["A. organise", "B. decorate", "C. divorce", "D. promise"],
  "correctAnswer": "C",
  "explanation": "'divorce' /dɪˈvɔːs/ is stressed on the 2nd syllable, while others are stressed on the 1st: 'organise' /ˈɔː.ɡən.aɪz/, 'decorate' /ˈdek.ə.reɪt/, 'promise' /ˈprɒm.ɪs/."
}

Example 2 (2-syllable words):
{
  "type": "MCQ",
  "question": "Choose the word that has a DIFFERENT stress pattern from the others.",
  "options": ["A. visit", "B. listen", "C. enjoy", "D. travel"],
  "correctAnswer": "C",
  "explanation": "'enjoy' /ɪnˈdʒɔɪ/ is stressed on the 2nd syllable (verb pattern), while others are stressed on the 1st: 'visit' /ˈvɪz.ɪt/, 'listen' /ˈlɪs.ən/, 'travel' /ˈtræv.əl/."
}
📌 DẠNG 2: VOCABULARY & UNSCRAMBLE (Từ vựng) - type: "MCQ" or "SHORT_ANSWER"
Mix the following styles:

Style A - Unscramble Word (MCQ): Scramble letters of a word, give 4 options.
Example: { "type": "MCQ", "question": "Unscramble: LURRE - A thing used to draw lines.", "options": ["A. RULER", "B. RURAL", "C. RULED", "D. RUNNER"], "correctAnswer": "A" }

Style B - Missing Character (SHORT_ANSWER): 
⚠️ CRITICAL FORMAT RULES:
1. The blank must be shown as underscore(s) INLINE with the word
2. Use format: WORD with missing letters shown as _ (e.g., "B_DY" for BODY, "FR_END" for FRIEND)
3. The question should be ONE COMPLETE SENTENCE with the incomplete word
4. Put the definition in parentheses ONLY at the end
5. correctAnswer is ONLY the missing letter(s), NOT the full word

✅ CORRECT FORMAT:
{ "type": "SHORT_ANSWER", "question": "I have two hands and two feet on my B_DY. (body part)", "correctAnswer": "O" }
{ "type": "SHORT_ANSWER", "question": "He is my best FR__ND.", "correctAnswer": "IE" }
{ "type": "SHORT_ANSWER", "question": "The T__CHER teaches us English.", "correctAnswer": "EA" }

❌ WRONG FORMAT (DO NOT DO THIS):
{ "question": "B [blank] DY - The physical structure..." } // DON'T split word
{ "question": "What is BODY?", "correctAnswer": "BODY" } // DON'T ask for full word

📌 DẠNG 3: GRAMMAR & ERROR IDENTIFICATION (Ngữ pháp) - type: "MCQ"
Focus: Subject-Verb Agreement (am/is/are), Possessive Adjectives (my/his/her), Prepositions (in/on/at).
Style A - Find the mistake: Sentence with 4 underlined parts, ONE has grammatical error.
  Example: 'That [A] is my sister. [B] His name [C] is [D] Lan.' (Error: B - His -> Her)
Style B - Choose the correct sentence: Provide 4 sentences, only 1 is grammatically correct.
  Example: A. He are my friend. B. He is my friend. C. He am my friend. D. He be my friend.
Output: { "type": "MCQ", "question": "Choose the correct sentence:", "options": ["A. He are my friend.", "B. He is my friend.", "C. He am my friend.", "D. He be my friend."], "correctAnswer": "B", "explanation": "Subject 'He' uses 'is'." }

📌 DẠNG 4: SENTENCE REORDERING (Sắp xếp câu) - type: "ORDERING"
### ROLE
You are a Lead Content Developer for the Vietnam IOE (Internet Olympiad of English) exam system. Your specialty is creating "Sentence Reordering" gamified questions for primary school students (Grades 3-5).

### OBJECTIVE
Generate a dataset of sentences broken down into "drag-and-drop cards".

### CURRICULUM CONSTRAINTS
1.  **Vocabulary Source:** Strictly follow the Vietnamese Ministry of Education English curriculum (Textbooks: Global Success, Family & Friends, i-Learn Smart Start).
2.  **Level:** CEFR A1 (Beginner). Sentences must be simple, direct, and unambiguous.
3.  **Sentence Length:** 4 to 6 words/phrases max.

### FORMATTING RULES (CRITICAL)
1.  **The "Card" Concept:** The sentence must be split into chunks (cards).
2.  **Punctuation Handling (VERY IMPORTANT):** 
    - Punctuation marks (period '.', question mark '?', comma ',', exclamation '!') MUST remain attached to the word that precedes them in the ORIGINAL correct sentence.
    - The final punctuation (. or ? or !) must be on the LAST WORD of the CORRECT sentence order, NOT on any other word.
    - ⚠️ CRITICAL: If correct sentence is "I go to school every day." then items must be: ["I", "go", "to", "school", "every", "day."] - Note "day." has the period, NOT "school."
    * ✅ *Right:* Sentence "I am from Vietnam." → ["I", "am", "from", "Vietnam."]
    * ❌ *Wrong:* ["I", "am.", "from", "Vietnam"] (Period on wrong word)
    * ❌ *Wrong:* ["I", "am", "from", "Vietnam", "."] (Separate period)
3.  **Capitalization:** The first word of the sentence must be capitalized. Proper nouns must be capitalized.
4.  **Shuffling:** The output cards must be RANDOMIZED (shuffled) so they do not form the correct sentence initially.

### OUTPUT FORMAT
Provide the output strictly as a JSON Object with this structure:
{
  "type": "ORDERING",
  "question": "Arrange the words to make a correct sentence:",
  "items": ["card1", "card2", "card3"], // Array of strings (SHUFFLED)
  "correctOrder": [2, 0, 1], // Array of INDICES representing the correct order
  "explanation": "Full correct sentence for reference."
}

EXAMPLE 1:
Full sentence: "Open your book, please."
→ items (shuffled): ["please.", "book,", "Open", "your"]
→ correctOrder: [2, 3, 1, 0]  (Open=2, your=3, book,=1, please.=0)

EXAMPLE 2:
Full sentence: "I go to school every day."
→ items (shuffled): ["school", "every", "day.", "I", "to", "go"]
→ correctOrder: [3, 5, 4, 0, 1, 2]  (I=3, go=5, to=4, school=0, every=1, day.=2)
Note: "day." has period because it's the LAST word!

📌 DẠNG 5: READING COMPREHENSION (Đọc hiểu) - type: "TRUE_FALSE"
Structure:
- Write short paragraph (30-50 words): Someone's daily routine, describing a room, introducing family.
- Use specific times (6:30, 7:00) and specific nouns (books, homework, breakfast).
- Create statements based on text, ask TRUE or FALSE.
Output: { "type": "TRUE_FALSE", "mainQuestion": "I am Mary. I get up at six o'clock. I have breakfast at six thirty. I go to school at seven.\\n\\nRead and choose True or False:", "items": [{"statement": "Mary gets up at 6 o'clock.", "isCorrect": true}, {"statement": "Mary has breakfast at 7 o'clock.", "isCorrect": false}] }

📌 DẠNG 7: LISTENING GAP-FILL (Nghe điền từ) - type: "SHORT_ANSWER"
### ROLE
You are an English Content Developer for IOE exam (Grade 3-5).
Your task is to create "Listening & Gap-Fill" questions.

### DIFFICULTY CONSTRAINTS
1. Grammar: Present Simple Tense (Subject + to be + Preposition + Place).
2. Vocabulary:
   - Common Objects: ball, book, pen, cat, dog, bag, hat, toy.
   - Prepositions: in, on, under, behind, next to, near.
   - Furniture/Places: table, chair, box, desk, bed, floor, room.
3. Length: Short sentences (5-8 words).

### FORMAT RULES
1. Create a simple English sentence (audio script).
2. Replace ONE word with ___ (usually the last Noun or Preposition).
3. correctAnswer is the hidden word ONLY (not the full word, just the missing part).
4. ⚠️ CRITICAL: "explanation" field MUST contain the EXACT full sentence that will be spoken aloud by text-to-speech!

### OUTPUT FORMAT
{ 
  "type": "SHORT_ANSWER", 
  "question": "🎧 The ball is on the ___.", 
  "correctAnswer": "table",
  "explanation": "The ball is on the table."
}

⚠️ IMPORTANT: 
- question MUST start with 🎧 emoji
- explanation MUST be the complete sentence WITHOUT "Full sentence:" prefix - just the sentence itself!
- The explanation is used for TEXT-TO-SPEECH, so it must be clean and readable

Examples:
{ "type": "SHORT_ANSWER", "question": "🎧 My cat is under the ___.", "correctAnswer": "bed", "explanation": "My cat is under the bed." }
{ "type": "SHORT_ANSWER", "question": "🎧 The book is ___ the desk.", "correctAnswer": "on", "explanation": "The book is on the desk." }
{ "type": "SHORT_ANSWER", "question": "🎧 There is a ___ in the box.", "correctAnswer": "toy", "explanation": "There is a toy in the box." }

===== OUTPUT JSON FORMAT =====
{
  "title": "IOE Grade X: Topic Name",
  "questions": [...]
}

===== IMPORTANT REMINDERS =====
- ALL questions MUST be in ENGLISH
- Use simple vocabulary appropriate for Vietnamese primary students
- Difficulty increases gradually: easy first, harder at end
- Include correct answer and brief explanation for each question
- Ensure strictly correct JSON syntax`;

const IoeTab: React.FC<IoeTabProps> = ({ onSaveQuiz, onSuccess }) => {
    // Form state
    const [quizTitle, setQuizTitle] = useState('Đề luyện thi IOE Lớp 3');
    const [classLevel, setClassLevel] = useState('3');
    const [topic, setTopic] = useState('');
    const [selectedTopics, setSelectedTopics] = useState<string[]>(['school']); // Multi-select topics
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

    // Question types count
    const [questionCounts, setQuestionCounts] = useState<Record<string, number>>(() => {
        const counts: Record<string, number> = {};
        IOE_QUESTION_TYPES.forEach(qt => counts[qt.id] = qt.defaultCount);
        return counts;
    });

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
    const [error, setError] = useState<string | null>(null);

    // AI Provider - lưu vào localStorage
    const [aiProvider] = useState<AIProvider>(() =>
        (localStorage.getItem('ai_provider') as AIProvider) || 'llm-mux'
    );

    // Quiz link modal
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [savedQuizLink, setSavedQuizLink] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);

    // Time limit based on total questions
    const totalQuestions = Object.values(questionCounts).reduce((a, b) => a + b, 0);
    const estimatedTime = Math.max(5, Math.ceil(totalQuestions * 0.5)); // ~30 giây/câu

    // Apply template
    const applyTemplate = (templateId: string) => {
        const template = IOE_TEMPLATES.find(t => t.id === templateId);
        if (template) {
            setSelectedTemplate(templateId);
            // Phân bố câu hỏi theo template
            const baseCount = Math.floor(template.questions / IOE_QUESTION_TYPES.length);
            const remainder = template.questions % IOE_QUESTION_TYPES.length;
            const newCounts: Record<string, number> = {};
            IOE_QUESTION_TYPES.forEach((qt, idx) => {
                newCounts[qt.id] = baseCount + (idx < remainder ? 1 : 0);
            });
            setQuestionCounts(newCounts);
        }
    };

    // Generate IOE prompt with System Instruction
    const generateIoePrompt = (): string => {
        const difficultyText = difficulty === 'easy' ? 'Easy (A1 basic)' : difficulty === 'medium' ? 'Medium (A1)' : 'Hard (A1+)';

        // Get topic names from selected IDs
        const topicNames = selectedTopics
            .map(id => IOE_TOPICS.find(t => t.id === id)?.name)
            .filter(Boolean)
            .join(', ');

        let prompt = `${IOE_SYSTEM_INSTRUCTION}

---

🎯 SPECIFIC REQUEST FOR THIS QUIZ:
Grade Level: ${classLevel}
Topics: ${topicNames || topic || 'General English vocabulary and grammar'}
Difficulty: ${difficultyText}
${topic ? `Custom Topic: ${topic}` : ''}

📊 QUESTION DISTRIBUTION:
`;
        // Thêm các dạng câu hỏi
        IOE_QUESTION_TYPES.forEach(qt => {
            const count = questionCounts[qt.id];
            if (count > 0) {
                prompt += `- ${count} questions: ${qt.name} (${qt.description})\n`;
            }
        });

        prompt += `
TOTAL: ${totalQuestions} questions

⚠️ FINAL CHECKLIST:
1. ALL questions MUST be in ENGLISH
2. Use vocabulary from topics: ${topicNames}
3. Grade ${classLevel} Vietnamese students (A1 CEFR level)
4. Correct JSON syntax with all required fields
5. Include IPA for phonetics questions
6. Difficulty increases gradually: easy first, harder at end`;

        return prompt;
    };

    // Handle generate
    const handleGenerate = async () => {
        if (totalQuestions === 0) {
            setError('Vui lòng chọn ít nhất 1 dạng câu hỏi');
            return;
        }

        // Limit max questions to prevent timeout
        if (totalQuestions > 50) {
            setError(`⚠️ Tối đa 50 câu/lần tạo (bạn đang chọn ${totalQuestions} câu). Hãy giảm số lượng để tránh timeout.`);
            return;
        }

        setError(null);
        setIsGenerating(true);

        try {
            const customPrompt = generateIoePrompt();

            // Map IOE question types to app question types
            const enabledTypes: QuestionType[] = [];
            if (questionCounts['phonetics'] > 0) enabledTypes.push(QuestionType.MCQ);
            if (questionCounts['word_stress'] > 0) enabledTypes.push(QuestionType.MCQ);
            if (questionCounts['vocabulary'] > 0) {
                enabledTypes.push(QuestionType.MCQ);
                enabledTypes.push(QuestionType.SHORT_ANSWER);
            }
            if (questionCounts['grammar'] > 0) enabledTypes.push(QuestionType.MCQ);
            if (questionCounts['sentence_order'] > 0) enabledTypes.push(QuestionType.ORDERING);
            if (questionCounts['listening'] > 0) enabledTypes.push(QuestionType.SHORT_ANSWER);
            if (questionCounts['reading'] > 0) enabledTypes.push(QuestionType.TRUE_FALSE);

            const result = await generateQuiz(
                topic || 'English IOE',
                classLevel,
                '', // no content
                null, // no file
                {
                    title: quizTitle || `IOE Lớp ${classLevel}: ${topic || 'English Practice'}`,
                    questionCount: totalQuestions,
                    questionTypes: enabledTypes.length > 0 ? enabledTypes : [QuestionType.MCQ],
                    difficultyLevels: {
                        level1: difficulty === 'easy' ? totalQuestions : Math.floor(totalQuestions * 0.3),
                        level2: difficulty === 'medium' ? totalQuestions : Math.floor(totalQuestions * 0.4),
                        level3: difficulty === 'hard' ? totalQuestions : Math.floor(totalQuestions * 0.3),
                    },
                    customPrompt,
                },
                undefined,
                aiProvider
            );

            const quiz: Quiz = {
                id: `ioe-${Date.now()}`,
                title: result.title || `IOE Lớp ${classLevel}: ${topic || 'English Practice'}`,
                classLevel,
                timeLimit: estimatedTime,
                questions: (result.questions || []).map((q: any, idx: number) => ({
                    ...q,
                    id: q.id || `ioe-q-${Date.now()}-${idx}`,
                })),
                createdAt: new Date().toISOString(),
                category: 'ioe',
            };

            setGeneratedQuiz(quiz);
        } catch (err: any) {
            console.error('IOE Quiz generation error:', err);
            setError(err.message || 'Đã xảy ra lỗi khi tạo đề IOE');
        } finally {
            setIsGenerating(false);
        }
    };

    // Handle save - Use IOE Sheet Service instead of main quiz store
    const handleSaveQuiz = async () => {
        if (!generatedQuiz) return;

        try {
            const success = await saveIoeQuiz(generatedQuiz);
            if (!success) {
                throw new Error('Không thể lưu quiz vào IOE Sheet');
            }

            // Generate shareable link
            const quizLink = `${window.location.origin}/?quiz=${generatedQuiz.id}`;
            setSavedQuizLink(quizLink);
            setLinkCopied(false);
            setShowLinkModal(true);

            // Reset form
            setTopic('');
            setGeneratedQuiz(null);
            setSelectedTemplate(null);

            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Lỗi khi lưu bài kiểm tra');
        }
    };

    // Copy link
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(savedQuizLink);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 3000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <div className="space-y-4">
                {/* Header Card */}
                <Card title="🌍 Tạo Đề IOE (Internet Olympiad in English)">
                    <div className="space-y-4">
                        {/* Quiz Title */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                🏷️ Tên bài kiểm tra
                            </label>
                            <input
                                type="text"
                                value={quizTitle}
                                onChange={e => setQuizTitle(e.target.value)}
                                placeholder="VD: Đề luyện thi IOE Lớp 3 - Vòng 1"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                            />
                        </div>

                        {/* Class & Topic */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Khối Lớp</label>
                                <select
                                    value={classLevel}
                                    onChange={e => setClassLevel(e.target.value)}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>Lớp {l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Độ khó</label>
                                <select
                                    value={difficulty}
                                    onChange={e => setDifficulty(e.target.value as any)}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="easy">Dễ</option>
                                    <option value="medium">Trung bình</option>
                                    <option value="hard">Khó</option>
                                </select>
                            </div>
                        </div>

                        {/* Topic Selector - Multi-select */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                📚 Chủ đề (chọn 1 hoặc nhiều)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {IOE_TOPICS.map(t => {
                                    const isSelected = selectedTopics.includes(t.id);
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedTopics(prev => prev.filter(id => id !== t.id));
                                                } else {
                                                    setSelectedTopics(prev => [...prev, t.id]);
                                                }
                                            }}
                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isSelected
                                                ? 'bg-blue-500 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {t.emoji} {t.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom Topic (optional) */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                ✏️ Chủ đề tùy chỉnh (tùy chọn)
                            </label>
                            <input
                                type="text"
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                placeholder="VD: Christmas, Halloween, Sports Day..."
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Templates */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">📋 Mẫu đề nhanh</label>
                            <div className="grid grid-cols-3 gap-2">
                                {IOE_TEMPLATES.map(template => {
                                    const Icon = template.icon;
                                    const isSelected = selectedTemplate === template.id;
                                    return (
                                        <button
                                            key={template.id}
                                            onClick={() => applyTemplate(template.id)}
                                            className={`p-3 rounded-xl border-2 transition-all text-center ${isSelected
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                                }`}
                                        >
                                            <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                                            <div className="text-xs font-bold">{template.name}</div>
                                            <div className="text-xs text-gray-500">{template.questions} câu • {template.time}p</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Question Types */}
                <Card title="📊 Dạng câu hỏi IOE">
                    <div className="space-y-3">
                        {IOE_QUESTION_TYPES.map(qt => (
                            <div key={qt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <div className="font-medium text-gray-800">{qt.name}</div>
                                    <div className="text-xs text-gray-500">{qt.description}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setQuestionCounts(prev => ({
                                            ...prev,
                                            [qt.id]: Math.max(0, prev[qt.id] - 1)
                                        }))}
                                        className="w-8 h-8 rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"
                                    >
                                        −
                                    </button>
                                    <input
                                        type="number"
                                        min="0"
                                        max="50"
                                        value={questionCounts[qt.id]}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value, 10);
                                            if (!isNaN(val) && val >= 0 && val <= 50) {
                                                setQuestionCounts(prev => ({ ...prev, [qt.id]: val }));
                                            } else if (e.target.value === '') {
                                                setQuestionCounts(prev => ({ ...prev, [qt.id]: 0 }));
                                            }
                                        }}
                                        className="w-12 text-center font-bold text-blue-600 border border-gray-300 rounded-lg py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <button
                                        onClick={() => setQuestionCounts(prev => ({
                                            ...prev,
                                            [qt.id]: Math.min(50, prev[qt.id] + 1)
                                        }))}
                                        className="w-8 h-8 rounded-full bg-white border border-gray-300 text-gray-600 hover:bg-gray-100"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Total */}
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="font-bold text-blue-800">Tổng số câu hỏi</div>
                            <div className="text-xl font-bold text-blue-600">{totalQuestions} câu • ~{estimatedTime} phút</div>
                        </div>
                    </div>
                </Card>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Generate Button */}
                <Button
                    onClick={handleGenerate}
                    loading={isGenerating}
                    disabled={totalQuestions === 0}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    size="lg"
                    variant="primary"
                    icon={<Globe className="w-5 h-5" />}
                >
                    {isGenerating ? 'Đang tạo đề IOE...' : `🌍 Tạo đề IOE (${totalQuestions} câu)`}
                </Button>
            </div>

            {/* Right Column - Preview */}
            <div>
                <QuizPreview
                    quiz={generatedQuiz}
                    onSave={handleSaveQuiz}
                    onUpdateQuestions={(questions) => {
                        if (generatedQuiz) {
                            // Always keep category as 'ioe' for IOE quizzes
                            setGeneratedQuiz({ ...generatedQuiz, questions, category: 'ioe' });
                        }
                    }}
                />
            </div>

            {/* Quiz Link Modal */}
            {showLinkModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <Check className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800">Lưu đề IOE thành công!</h3>
                            <p className="text-gray-500 text-sm mt-1">Chia sẻ link cho học sinh</p>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Link2 className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Link làm bài:</span>
                            </div>
                            <div className="bg-white border border-gray-300 rounded-lg p-3 font-mono text-sm text-blue-600 break-all">
                                {savedQuizLink}
                            </div>
                        </div>

                        <button
                            onClick={handleCopyLink}
                            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${linkCopied
                                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg'
                                }`}
                        >
                            {linkCopied ? (
                                <>
                                    <Check className="w-5 h-5" />
                                    Đã copy link!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-5 h-5" />
                                    Copy link gửi học sinh
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => setShowLinkModal(false)}
                            className="w-full mt-3 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IoeTab;
