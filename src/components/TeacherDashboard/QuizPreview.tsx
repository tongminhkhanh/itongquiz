import React, { useState, useEffect, useRef } from 'react';
import { Quiz, Question, QuestionType } from '../../types';
import { Card, Button, Modal } from '../common';
import { Save, PlusCircle, Edit3, Trash2, X, FileDown, Bold, Italic, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { formatMathText } from '../../utils/formatters';
import GeometryPreview from './GeometryPreview';
import { renderMathJax } from '../../hooks/useMathJax';
import TikZPreview from '../common/TikZPreview';
import { generateQuizDocx } from '../../utils/docxGenerator';
import { generateSmartDistractors } from '../../services/smartDistractorService';

// Helper to fix "Reorder the words" questions - replace : with / for word separators
const fixReorderQuestion = (text: string): string => {
    if (!text) return text;
    // Check if it's a "Reorder" question
    const reorderMatch = text.match(/^(Reorder(?:\s+the\s+words)?)\s*[:/]\s*/i);
    if (reorderMatch) {
        const prefix = reorderMatch[1];
        const wordsPartRaw = text.substring(reorderMatch[0].length);
        // Replace all " : " with " / " in the words part
        const wordsPart = wordsPartRaw.replace(/\s*:\s*/g, ' / ');
        return `${prefix}: ${wordsPart}`;
    }
    return text;
};

// Helper to insert tags at cursor position
const insertTags = (text: string, tag: 'b' | 'i', start: number, end: number) => {
    const openTag = `<${tag}>`;
    const closeTag = `</${tag}>`;

    // If no selection, just append at end (or at cursor location implies splitting)
    // If start === end, insert empty tags at cursor
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    // If selection already wrapped, unwrap it (simple check)
    // This is basic. For robustness, checking exact surrounding tags is better but complex.
    // For now, simple insertion.

    return `${before}${openTag}${selection}${closeTag}${after}`;
};

const toBoolean = (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    const normalized = String(value ?? '').trim().toLowerCase();
    if (['true', '1', 'd', 'yes'].includes(normalized)) return true;
    if (['false', '0', 's', 'no'].includes(normalized)) return false;
    return Boolean(value);
};

const normalizeTrueFalseItems = (items: any): { id: string; statement: string; isCorrect: boolean }[] => {
    if (!Array.isArray(items)) return [];
    return items.map((item: any, idx: number) => {
        if (item && typeof item === 'object') {
            return {
                id: String(item.id ?? `item-${idx + 1}`),
                statement: String(item.statement ?? item.text ?? item.content ?? ''),
                isCorrect: toBoolean(item.isCorrect ?? item.isTrue ?? item.correct ?? item.answer),
            };
        }

        return {
            id: `item-${idx + 1}`,
            statement: String(item ?? ''),
            isCorrect: false,
        };
    });
};

const normalizeDropdownBlanks = (blanks: any): { id: string; options: string[]; correctAnswer: string }[] => {
    if (!Array.isArray(blanks)) return [];

    return blanks.map((blank: any, idx: number) => {
        const rawOptions = Array.isArray(blank?.options)
            ? blank.options
            : typeof blank?.options === 'string'
                ? blank.options.split('|')
                : Array.isArray(blank?.choices)
                    ? blank.choices
                    : [];

        let options = rawOptions
            .map((opt: any) => String(opt ?? '').trim())
            .filter((opt: string) => opt.length > 0);

        let correctAnswer = String(blank?.correctAnswer ?? blank?.answer ?? blank?.correct ?? '').trim();

        if (!correctAnswer && options.length > 0) {
            correctAnswer = options[0];
        }

        if (correctAnswer && !options.includes(correctAnswer)) {
            options = [correctAnswer, ...options];
        }

        if (options.length === 0) {
            options = ['', ''];
        } else if (options.length === 1) {
            options = [...options, ''];
        }

        return {
            id: String(blank?.id ?? `${idx + 1}`),
            options,
            correctAnswer,
        };
    });
};

interface FormattingToolbarProps {
    onApply: (tag: 'b' | 'i') => void;
}

const FormattingToolbar: React.FC<FormattingToolbarProps> = ({ onApply }) => {
    return (
        <div className="flex items-center gap-1 mb-1 p-1 bg-gray-100 rounded border border-gray-200 w-fit">
            <button
                onClick={(e) => { e.preventDefault(); onApply('b'); }}
                className="p-1 hover:bg-gray-200 rounded font-bold w-6 h-6 flex items-center justify-center text-gray-700"
                title="In đậm (Bold)"
            >
                <span className="font-serif">B</span>
            </button>
            <button
                onClick={(e) => { e.preventDefault(); onApply('i'); }}
                className="p-1 hover:bg-gray-200 rounded italic w-6 h-6 flex items-center justify-center text-gray-700"
                title="In nghiêng (Italic)"
            >
                <span className="font-serif">I</span>
            </button>
        </div>
    );
};

interface QuizPreviewProps {
    quiz: Quiz | null;
    onSave: () => void;
    isSaving?: boolean;
    onUpdateQuestions?: (questions: Question[]) => void;
    onCreateManual?: () => void;
    onRegenerateQuestion?: (question: Question) => Promise<Question | null>;
}

const QuizPreview: React.FC<QuizPreviewProps> = ({ quiz, onSave, isSaving = false, onUpdateQuestions, onCreateManual, onRegenerateQuestion }) => {
    // Edit modal state
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [editQuestionText, setEditQuestionText] = useState('');
    const [editOptions, setEditOptions] = useState<string[]>([]);
    const [editCorrectAnswer, setEditCorrectAnswer] = useState('');
    const [editRiddleLines, setEditRiddleLines] = useState<string[]>([]);
    const [editAnswerLabel, setEditAnswerLabel] = useState('');
    // Additional states for other question types
    const [editItems, setEditItems] = useState<any[]>([]); // TRUE_FALSE items, ORDERING items
    const [editPairs, setEditPairs] = useState<{ left: string, right: string }[]>([]); // MATCHING pairs
    const [editLetters, setEditLetters] = useState<string[]>([]); // WORD_SCRAMBLE letters
    const [editCorrectWord, setEditCorrectWord] = useState(''); // WORD_SCRAMBLE correctWord
    const [editCorrectAnswers, setEditCorrectAnswers] = useState<string[]>([]); // MULTIPLE_SELECT correctAnswers
    // IMAGE_QUESTION specific
    const [editImageUrl, setEditImageUrl] = useState(''); // IMAGE_QUESTION image
    const [editOptionImages, setEditOptionImages] = useState<string[]>(['', '', '', '']); // IMAGE_QUESTION option images
    // DRAG_DROP specific
    const [editDragDropText, setEditDragDropText] = useState('');
    const [editBlanks, setEditBlanks] = useState<string[]>([]);
    const [editDistractors, setEditDistractors] = useState<string[]>([]);
    // ORDERING specific
    const [editCorrectOrder, setEditCorrectOrder] = useState<number[]>([]);
    // DROPDOWN specific
    const [editDropdownText, setEditDropdownText] = useState('');
    const [editDropdownBlanks, setEditDropdownBlanks] = useState<{ id: string; options: string[]; correctAnswer: string }[]>([]);
    // UNDERLINE specific
    const [editSentence, setEditSentence] = useState('');
    const [editWords, setEditWords] = useState<string[]>([]);
    const [editCorrectWordIndexes, setEditCorrectWordIndexes] = useState<number[]>([]);
    // CATEGORIZATION specific
    const [editCategories, setEditCategories] = useState<{ id: string; name: string }[]>([]);
    const [editCategorizationItems, setEditCategorizationItems] = useState<{ id: string; content: string; categoryId: string }[]>([]);
    // ERROR_CORRECTION specific
    const [editPassage, setEditPassage] = useState('');
    const [editWrongWord, setEditWrongWord] = useState('');
    const [editCorrectWord2, setEditCorrectWord2] = useState('');
    // Difficulty level
    const [editDifficulty, setEditDifficulty] = useState<1 | 2 | 3 | undefined>(undefined);

    // Smart Distractors state
    const [generatingDistractorId, setGeneratingDistractorId] = useState<string | null>(null);
    const [isGeneratingDistractors, setIsGeneratingDistractors] = useState(false);
    const [distractorCount, setDistractorCount] = useState(3);
    const [showDistractorPopover, setShowDistractorPopover] = useState<string | null>(null);
    const [distractorError, setDistractorError] = useState<string | null>(null);

    // Single Question Generation state
    const [isGeneratingSingle, setIsGeneratingSingle] = useState<string | null>(null);

    // Add Question modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newQuestionType, setNewQuestionType] = useState<QuestionType>(QuestionType.MCQ);

    // Refs for textareas to handle formatting insertion
    const editQuestionTextRef = useRef<HTMLTextAreaElement>(null);

    // Handle formatting apply
    const applyFormat = (tag: 'b' | 'i', target: 'question') => {
        if (target === 'question') {
            const textarea = editQuestionTextRef.current;
            if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const newText = insertTags(editQuestionText, tag, start, end);
                setEditQuestionText(newText);

                // Restore selection (offset by tag length)
                setTimeout(() => {
                    const newCursorPos = end + 2 + tag.length + 3 + tag.length + 1; // <b>...</b>
                    // Actually cursor should be after inserted tag or selecting content?
                    // Let's just focus back.
                    textarea.focus();
                }, 0);
            }
        }
    };

    const handleRegenerateSingleQuestion = async (q: Question) => {
        if (!onRegenerateQuestion) return;
        setIsGeneratingSingle(q.id);
        try {
            const newQ = await onRegenerateQuestion(q);
            if (newQ && onUpdateQuestions && quiz) {
                const updated = quiz.questions.map(existing => existing.id === q.id ? newQ : existing);
                onUpdateQuestions(updated);
            }
        } catch (error) {
            console.error("Failed to regenerate question:", error);
            alert("Lỗi khi sinh lại câu hỏi. Vui lòng thử lại.");
        } finally {
            setIsGeneratingSingle(null);
        }
    };

    // Ref for MathJax rendering
    const previewContainerRef = useRef<HTMLDivElement>(null);

    // Trigger MathJax rendering when quiz changes
    useEffect(() => {
        if (previewContainerRef.current && quiz) {
            const timeoutId = setTimeout(() => {
                renderMathJax(previewContainerRef.current);
            }, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [quiz]);

    // Close distractor popover when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setShowDistractorPopover(null);
        if (showDistractorPopover) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showDistractorPopover]);

    // Check if question type supports smart distractors
    const supportsDistractors = (type: QuestionType) => {
        return [QuestionType.MCQ, QuestionType.MULTIPLE_SELECT, QuestionType.IMAGE_QUESTION].includes(type);
    };

    // Generate smart distractors for a question (used in both preview list and edit modal)
    const handleGenerateDistractors = async (questionId: string, count: number, isFromModal = false) => {
        if (!quiz || !onUpdateQuestions) return;

        const question = quiz.questions.find(q => q.id === questionId);
        if (!question || !supportsDistractors(question.type)) return;

        const q = question as any;
        const options: string[] = q.options || [];

        // Support both single correct answer (MCQ) and multiple correct answers (MULTIPLE_SELECT)
        const correctLetters: string[] = q.correctAnswers && Array.isArray(q.correctAnswers)
            ? q.correctAnswers
            : q.correctAnswer ? [q.correctAnswer] : [];

        const correctIndices = correctLetters.map((letter: string) => letter.charCodeAt(0) - 65);
        const correctTexts = correctIndices.map((idx: number) => options[idx] || '').filter(Boolean);

        if (correctTexts.length === 0) {
            setDistractorError('Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u00e1p \u00e1n \u0111\u00fang. Vui l\u00f2ng ki\u1ec3m tra l\u1ea1i.');
            return;
        }

        // Set loading state
        if (isFromModal) {
            setIsGeneratingDistractors(true);
        } else {
            setGeneratingDistractorId(questionId);
        }
        setDistractorError(null);
        setShowDistractorPopover(null);

        try {
            // Number of distractors needed = total slots - correct answers
            const numDistractorsNeeded = count;

            const distractors = await generateSmartDistractors({
                question: q.question || q.mainQuestion || '',
                correctAnswer: correctTexts.join(', '),
                classLevel: quiz.classLevel || '3',
                difficulty: q.difficulty,
                existingOptions: options.filter((_: string, i: number) => !correctIndices.includes(i)),
                count: numDistractorsNeeded,
            });

            // Build new options array: keep correct answers at their positions, fill rest with distractors
            const totalOptions = correctIndices.length + numDistractorsNeeded;
            const newOptions: string[] = [];
            let distractorIdx = 0;

            for (let i = 0; i < totalOptions; i++) {
                if (correctIndices.includes(i)) {
                    // Keep correct answer at this position
                    const correctTextIdx = correctIndices.indexOf(i);
                    newOptions.push(correctTexts[correctTextIdx]);
                } else if (distractorIdx < distractors.length) {
                    newOptions.push(distractors[distractorIdx]);
                    distractorIdx++;
                }
            }

            // Update question in quiz
            if (isFromModal) {
                // Update edit state in modal
                setEditOptions(newOptions);
            } else {
                // Update quiz directly
                const updatedQuestions = quiz.questions.map(qq => {
                    if (qq.id !== questionId) return qq;
                    return { ...qq, options: newOptions } as Question;
                });
                onUpdateQuestions(updatedQuestions);
            }
        } catch (error: any) {
            setDistractorError(error.message || 'Kh\u00f4ng th\u1ec3 t\u1ea1o \u0111\u00e1p \u00e1n nhi\u1ec5u. Th\u1eed l\u1ea1i sau.');
        } finally {
            setGeneratingDistractorId(null);
            setIsGeneratingDistractors(false);
        }
    };

    // Delete a question
    const handleDeleteQuestion = (questionId: string) => {
        if (!quiz || !onUpdateQuestions) return;
        const updated = quiz.questions.filter(q => q.id !== questionId);
        onUpdateQuestions(updated);
    };

    // Open edit modal
    const handleEditQuestion = (question: Question) => {
        setEditingQuestion(question);

        // Use type-based mapping to avoid mismatched `question` vs `mainQuestion` in legacy data.
        if (question.type === QuestionType.TRUE_FALSE) {
            setEditQuestionText((question as any).mainQuestion || (question as any).question || '');
        } else {
            setEditQuestionText((question as any).question || (question as any).mainQuestion || '');
        }

        // Fix: Load properties based on Question Type instead of key existence
        if (question.type === QuestionType.MCQ ||
            question.type === QuestionType.MULTIPLE_SELECT ||
            question.type === QuestionType.IMAGE_QUESTION) {
            setEditOptions((question as any).options && (question as any).options.length > 0 ? [...(question as any).options] : ['', '', '', '']);
        }

        if (question.type === QuestionType.MCQ ||
            question.type === QuestionType.SHORT_ANSWER ||
            question.type === QuestionType.IMAGE_QUESTION ||
            question.type === QuestionType.RIDDLE) {
            setEditCorrectAnswer((question as any).correctAnswer || '');
        }

        if (question.type === QuestionType.MULTIPLE_SELECT) {
            setEditCorrectAnswers((question as any).correctAnswers ? [...(question as any).correctAnswers] : []);
        }
        // RIDDLE specific
        // RIDDLE specific
        if (question.type === QuestionType.RIDDLE) {
            setEditRiddleLines((question as any).riddleLines ? [...(question as any).riddleLines] : []);
            setEditAnswerLabel((question as any).answerLabel || '');
        }

        // TRUE_FALSE items
        if (question.type === QuestionType.TRUE_FALSE) {
            const normalizedItems = normalizeTrueFalseItems((question as any).items);
            setEditItems(
                normalizedItems.length > 0
                    ? normalizedItems
                    : [
                        { id: '1', statement: '', isCorrect: true },
                        { id: '2', statement: '', isCorrect: false },
                    ]
            );
        }

        // ORDERING items
        if (question.type === QuestionType.ORDERING) {
            setEditItems((question as any).items ? [...(question as any).items] : []);
        }

        // MATCHING pairs
        if (question.type === QuestionType.MATCHING) {
            setEditPairs((question as any).pairs ? [...(question as any).pairs] : []);
        }

        // WORD_SCRAMBLE
        if (question.type === QuestionType.WORD_SCRAMBLE) {
            setEditLetters((question as any).letters ? [...(question as any).letters] : []);
            setEditCorrectWord((question as any).correctWord || '');
        }

        // IMAGE_QUESTION specific
        if (question.type === QuestionType.IMAGE_QUESTION) {
            setEditImageUrl((question as any).image || '');
            setEditOptionImages((question as any).optionImages || ['', '', '', '']);
        }

        // Load image for all types (except IMAGE_QUESTION/DROPDOWN which have their own handlers)
        if (question.type !== QuestionType.IMAGE_QUESTION && question.type !== QuestionType.DROPDOWN) {
            setEditImageUrl((question as any).image || '');
        }
        // DRAG_DROP specific
        if (question.type === QuestionType.DRAG_DROP) {
            setEditDragDropText((question as any).text || '');
            setEditBlanks((question as any).blanks ? [...(question as any).blanks] : []);
            setEditDistractors((question as any).distractors ? [...(question as any).distractors] : []);
        }

        // ORDERING specific
        if (question.type === QuestionType.ORDERING) {
            setEditCorrectOrder((question as any).correctOrder ? [...(question as any).correctOrder] : []);
        }

        // DROPDOWN specific
        if (question.type === QuestionType.DROPDOWN) {
            setEditDropdownText((question as any).text || '');
            const normalizedBlanks = normalizeDropdownBlanks((question as any).blanks);
            setEditDropdownBlanks(
                normalizedBlanks.length > 0
                    ? normalizedBlanks
                    : [{ id: '1', options: ['', ''], correctAnswer: '' }]
            );
            // Fix: Load image for DROPDOWN
            setEditImageUrl((question as any).image || '');
        }

        // UNDERLINE specific
        if (question.type === QuestionType.UNDERLINE) {
            setEditSentence((question as any).sentence || '');
            setEditWords((question as any).words ? [...(question as any).words] : []);
            setEditCorrectWordIndexes((question as any).correctWordIndexes ? [...(question as any).correctWordIndexes] : []);
        }

        // CATEGORIZATION specific
        if (question.type === QuestionType.CATEGORIZATION) {
            const loadedCats = (question as any).categories ? (question as any).categories.map((c: any) => ({ ...c })) : [];
            if (loadedCats.length === 0) {
                // Auto-fix broken empty categories from previous bugs
                setEditCategories([
                    { id: `cat-auto-1`, name: 'Nhóm 1' },
                    { id: `cat-auto-2`, name: 'Nhóm 2' }
                ]);
            } else {
                setEditCategories(loadedCats);
            }
            setEditCategorizationItems((question as any).items ? (question as any).items.map((i: any) => ({ ...i })) : []);
        }

        // ERROR_CORRECTION specific
        if (question.type === QuestionType.ERROR_CORRECTION) {
            setEditPassage((question as any).passage || '');
            setEditWrongWord((question as any).wrongWord || '');
            setEditCorrectWord2((question as any).correctWord || '');
        }

        // Difficulty level (common for all types)
        setEditDifficulty((question as any).difficulty || undefined);
    };

    // Save edited question
    const handleSaveEditedQuestion = () => {
        if (!editingQuestion || !quiz || !onUpdateQuestions) return;

        const updatedQuestions = quiz.questions.map(q => {
            if (q.id !== editingQuestion.id) return q;

            const updated: any = { ...q };

            if (updated.type === QuestionType.TRUE_FALSE) {
                updated.mainQuestion = editQuestionText;
                // Keep `question` in sync for compatibility with old render paths.
                updated.question = editQuestionText;
            } else {
                updated.question = editQuestionText;
            }

            // MCQ, MULTIPLE_SELECT, IMAGE_QUESTION options
            if (updated.type === QuestionType.MCQ ||
                updated.type === QuestionType.MULTIPLE_SELECT ||
                updated.type === QuestionType.IMAGE_QUESTION) {
                updated.options = editOptions;
            }

            // correctAnswer for MCQ, SHORT_ANSWER, IMAGE_QUESTION, RIDDLE
            if (updated.type === QuestionType.MCQ ||
                updated.type === QuestionType.SHORT_ANSWER ||
                updated.type === QuestionType.IMAGE_QUESTION ||
                updated.type === QuestionType.RIDDLE) {
                updated.correctAnswer = editCorrectAnswer;
            }

            // Save image for all types (except IMAGE_QUESTION/DROPDOWN which have their own handlers)
            if (updated.type !== QuestionType.IMAGE_QUESTION && updated.type !== QuestionType.DROPDOWN) {
                updated.image = editImageUrl || undefined;
            }

            // RIDDLE specific
            if (updated.type === QuestionType.RIDDLE) {
                updated.riddleLines = editRiddleLines;
                updated.answerLabel = editAnswerLabel;
            }

            // TRUE_FALSE items
            if (updated.type === QuestionType.TRUE_FALSE) {
                updated.items = normalizeTrueFalseItems(editItems).filter(item => item.statement.trim());
            }

            // ORDERING items and correctOrder
            if (updated.type === QuestionType.ORDERING) {
                updated.items = editItems;
                updated.correctOrder = editCorrectOrder;
            }

            // MATCHING pairs
            if (updated.type === QuestionType.MATCHING) {
                updated.pairs = editPairs;
            }

            // WORD_SCRAMBLE
            if (updated.type === QuestionType.WORD_SCRAMBLE) {
                updated.letters = editLetters;
                updated.correctWord = editCorrectWord;
            }

            // MULTIPLE_SELECT correctAnswers
            if (updated.type === QuestionType.MULTIPLE_SELECT) {
                updated.correctAnswers = editCorrectAnswers;
            }

            // IMAGE_QUESTION specific - always save image field
            if (updated.type === QuestionType.IMAGE_QUESTION) {
                updated.image = editImageUrl;
                const hasAnyOptionImage = editOptionImages.some(img => img.trim());
                if (hasAnyOptionImage) {
                    updated.optionImages = editOptionImages;
                }
            }

            // DRAG_DROP specific - always save all fields
            if (updated.type === QuestionType.DRAG_DROP) {
                updated.text = editDragDropText;
                updated.blanks = editBlanks;
                updated.distractors = editDistractors;
            }

            // DROPDOWN specific - always save all fields
            if (updated.type === QuestionType.DROPDOWN) {
                updated.text = editDropdownText;
                updated.blanks = normalizeDropdownBlanks(editDropdownBlanks).map((blank) => {
                    const cleanOptions = blank.options
                        .map((opt) => String(opt ?? '').trim())
                        .filter((opt) => opt.length > 0);

                    let correctAnswer = String(blank.correctAnswer ?? '').trim();
                    if (!correctAnswer && cleanOptions.length > 0) {
                        correctAnswer = cleanOptions[0];
                    }

                    return {
                        ...blank,
                        options: cleanOptions,
                        correctAnswer,
                    };
                }).filter((blank) => blank.options.length > 0);
                // Fix: Save image for DROPDOWN
                updated.image = editImageUrl;
            }

            // UNDERLINE specific - always save all fields
            if (updated.type === QuestionType.UNDERLINE) {
                updated.sentence = editSentence;
                updated.words = editWords;
                updated.correctWordIndexes = editCorrectWordIndexes;
            }

            // CATEGORIZATION specific - always save all fields
            if (updated.type === QuestionType.CATEGORIZATION) {
                const finalCategories = editCategories.map((c, i) => ({ ...c, name: c.name.trim() || `Nhóm ${i + 1}` }));
                // Ensure all items are assigned to a valid category ID (fallback to first category if exist)
                const validCategoryIds = new Set(finalCategories.map(c => c.id));
                const finalItems = editCategorizationItems.filter(i => i.content.trim()).map(item => {
                    if (!validCategoryIds.has(item.categoryId)) {
                        return { ...item, categoryId: finalCategories[0]?.id || '' };
                    }
                    return item;
                });
                updated.categories = finalCategories;
                updated.items = finalItems;
            }

            // ERROR_CORRECTION specific - always save all fields
            if (updated.type === QuestionType.ERROR_CORRECTION) {
                updated.passage = editPassage;
                updated.wrongWord = editWrongWord;
                updated.correctWord = editCorrectWord2;
            }

            // Difficulty level (common for all types)
            if (editDifficulty !== undefined) {
                updated.difficulty = editDifficulty;
            }

            return updated as Question;
        });

        onUpdateQuestions(updatedQuestions);
        handleCloseEditModal();
    };

    // Close edit modal
    const handleCloseEditModal = () => {
        setEditingQuestion(null);
        setEditQuestionText('');
        setEditOptions([]);
        setEditCorrectAnswer('');
        setEditRiddleLines([]);
        setEditAnswerLabel('');
        setEditItems([]);
        setEditPairs([]);
        setEditLetters([]);
        setEditCorrectWord('');
        setEditCorrectAnswers([]);
        // Reset new states
        setEditImageUrl('');
        setEditDragDropText('');
        setEditBlanks([]);
        setEditDistractors([]);
        setEditCorrectOrder([]);
        setEditDropdownText('');
        setEditDropdownBlanks([]);
        setEditSentence('');
        setEditWords([]);
        setEditCorrectWordIndexes([]);
        setEditCategories([]);
        setEditCategorizationItems([]);
        setEditDifficulty(undefined);
    };

    // Open Add Question modal with defaults for selected type
    const handleOpenAddModal = (type: QuestionType) => {
        setNewQuestionType(type);
        setEditQuestionText('');
        setEditCorrectAnswer('');
        setEditImageUrl(''); // Reset image for all types

        // Set defaults based on type
        switch (type) {
            case QuestionType.MCQ:
            case QuestionType.MULTIPLE_SELECT:
            case QuestionType.IMAGE_QUESTION:
                setEditOptions(['', '', '', '']);
                setEditCorrectAnswers([]);
                setEditImageUrl('');
                break;
            case QuestionType.TRUE_FALSE:
                setEditItems([
                    { id: '1', statement: '', isCorrect: true },
                    { id: '2', statement: '', isCorrect: false },
                ]);
                break;
            case QuestionType.MATCHING:
                setEditPairs([
                    { left: '', right: '' },
                    { left: '', right: '' },
                ]);
                break;
            case QuestionType.SHORT_ANSWER:
                // Just question and correct answer
                setEditImageUrl('');
                break;
            case QuestionType.DROPDOWN:
                setEditDropdownText('');
                setEditDropdownBlanks([{ id: '1', options: ['', '', ''], correctAnswer: '' }]);
                setEditImageUrl('');
                break;
            case QuestionType.ORDERING:
                setEditItems(['', '', '']);
                setEditCorrectOrder([0, 1, 2]);
                break;
            case QuestionType.WORD_SCRAMBLE:
                setEditLetters([]);
                setEditCorrectWord('');
                break;
            case QuestionType.CATEGORIZATION:
                setEditCategories([
                    { id: '1', name: '' },
                    { id: '2', name: '' },
                ]);
                setEditCategorizationItems([
                    { id: '1', content: '', categoryId: '1' },
                    { id: '2', content: '', categoryId: '2' },
                ]);
                break;
            case QuestionType.UNDERLINE:
                setEditSentence('');
                setEditWords([]);
                setEditCorrectWordIndexes([]);
                break;
            case QuestionType.DRAG_DROP:
                setEditDragDropText('');
                setEditBlanks([]);
                setEditDistractors([]);
                break;
            case QuestionType.RIDDLE:
                setEditRiddleLines(['', '']);
                setEditAnswerLabel('');
                setEditCorrectAnswer('');
                break;
            case QuestionType.ERROR_CORRECTION:
                setEditPassage('');
                setEditWrongWord('');
                setEditCorrectWord2('');
                break;
            default:
                break;
        }

        setShowAddModal(true);
    };

    // Add new question to quiz
    const handleAddQuestion = () => {
        if (!quiz || !onUpdateQuestions) return;

        const newId = `q-manual-${Date.now()}`;
        let newQuestion: Question;

        switch (newQuestionType) {
            case QuestionType.MCQ:
                newQuestion = {
                    id: newId,
                    type: QuestionType.MCQ,
                    question: editQuestionText,
                    options: editOptions.filter(o => o.trim()),
                    correctAnswer: editCorrectAnswer,
                    image: editImageUrl || undefined,
                } as any;
                break;
            case QuestionType.MULTIPLE_SELECT:
                newQuestion = {
                    id: newId,
                    type: QuestionType.MULTIPLE_SELECT,
                    question: editQuestionText,
                    options: editOptions.filter(o => o.trim()),
                    correctAnswers: editCorrectAnswers,
                    image: editImageUrl || undefined,
                } as any;
                break;
            case QuestionType.TRUE_FALSE:
                newQuestion = {
                    id: newId,
                    type: QuestionType.TRUE_FALSE,
                    mainQuestion: editQuestionText,
                    items: editItems.filter(item => item.statement.trim()),
                } as any;
                break;
            case QuestionType.SHORT_ANSWER:
                newQuestion = {
                    id: newId,
                    type: QuestionType.SHORT_ANSWER,
                    question: editQuestionText,
                    correctAnswer: editCorrectAnswer,
                    image: editImageUrl || undefined,
                } as any;
                break;
            case QuestionType.MATCHING:
                newQuestion = {
                    id: newId,
                    type: QuestionType.MATCHING,
                    question: editQuestionText,
                    pairs: editPairs.filter(p => p.left.trim() && p.right.trim()),
                } as any;
                break;
            case QuestionType.IMAGE_QUESTION: {
                const imgQ: any = {
                    id: newId,
                    type: QuestionType.IMAGE_QUESTION,
                    question: editQuestionText,
                    image: editImageUrl,
                    options: editOptions.filter(o => o.trim()),
                    correctAnswer: editCorrectAnswer,
                };
                const hasAnyOptImg = editOptionImages.some(img => img.trim());
                if (hasAnyOptImg) {
                    imgQ.optionImages = editOptionImages;
                }
                newQuestion = imgQ;
                break;
            }
            case QuestionType.DROPDOWN:
                newQuestion = {
                    id: newId,
                    type: QuestionType.DROPDOWN,
                    question: editQuestionText,
                    text: editDropdownText,
                    blanks: editDropdownBlanks.filter(b => b.correctAnswer.trim()),
                    image: editImageUrl,
                } as any;
                break;
            case QuestionType.WORD_SCRAMBLE:
                newQuestion = {
                    id: newId,
                    type: QuestionType.WORD_SCRAMBLE,
                    question: editQuestionText,
                    letters: editLetters,
                    correctWord: editCorrectWord,
                } as any;
                break;
            case QuestionType.CATEGORIZATION: {
                const finalCategories = editCategories.map((c, i) => ({ ...c, name: c.name.trim() || `Nhóm ${i + 1}` }));
                const validCategoryIds = new Set(finalCategories.map(c => c.id));
                const finalItems = editCategorizationItems.filter(i => i.content.trim()).map(item => {
                    if (!validCategoryIds.has(item.categoryId)) {
                        return { ...item, categoryId: finalCategories[0]?.id || '' };
                    }
                    return item;
                });
                newQuestion = {
                    id: newId,
                    type: QuestionType.CATEGORIZATION,
                    question: editQuestionText,
                    categories: finalCategories,
                    items: finalItems,
                } as any;
                break;
            }
            case QuestionType.UNDERLINE:
                newQuestion = {
                    id: newId,
                    type: QuestionType.UNDERLINE,
                    question: editQuestionText,
                    sentence: editSentence,
                    words: editWords,
                    correctWordIndexes: editCorrectWordIndexes,
                } as any;
                break;
            case QuestionType.DRAG_DROP:
                newQuestion = {
                    id: newId,
                    type: QuestionType.DRAG_DROP,
                    question: editQuestionText,
                    text: editDragDropText,
                    blanks: editBlanks.filter(b => b.trim()),
                    distractors: editDistractors.filter(d => d.trim()),
                } as any;
                break;
            case QuestionType.RIDDLE:
                newQuestion = {
                    id: newId,
                    type: QuestionType.RIDDLE,
                    question: editQuestionText,
                    riddleLines: editRiddleLines.filter(l => l.trim()),
                    correctAnswer: editCorrectAnswer,
                    answerLabel: editAnswerLabel || 'Đáp án',
                } as any;
                break;
            case QuestionType.ERROR_CORRECTION:
                newQuestion = {
                    id: newId,
                    type: QuestionType.ERROR_CORRECTION,
                    question: editQuestionText,
                    passage: editPassage,
                    wrongWord: editWrongWord,
                    correctWord: editCorrectWord2,
                } as any;
                break;
            case QuestionType.ORDERING:
                newQuestion = {
                    id: newId,
                    type: QuestionType.ORDERING,
                    question: editQuestionText,
                    items: editItems.filter(item => (typeof item === 'string' ? item : '').trim()),
                    correctOrder: editCorrectOrder,
                } as any;
                break;
            default:
                newQuestion = {
                    id: newId,
                    type: newQuestionType,
                    question: editQuestionText,
                    correctAnswer: editCorrectAnswer,
                } as any;
        }

        // Save difficulty if selected
        if (editDifficulty !== undefined) {
            (newQuestion as any).difficulty = editDifficulty;
        }

        // Save image if provided (for types that don't already include it)
        if (editImageUrl && (newQuestion as any).image === undefined) {
            (newQuestion as any).image = editImageUrl;
        }

        const updated = [...quiz.questions, newQuestion];
        onUpdateQuestions(updated);
        setShowAddModal(false);
        handleCloseEditModal(); // Reset all edit states
    };

    // Get question type label
    const getTypeLabel = (type: QuestionType) => {
        const labels: Record<string, string> = {
            [QuestionType.MCQ]: 'Trắc nghiệm',
            [QuestionType.TRUE_FALSE]: 'Đúng/Sai',
            [QuestionType.SHORT_ANSWER]: 'Điền đáp án',
            [QuestionType.MATCHING]: 'Nối cột',
            [QuestionType.MULTIPLE_SELECT]: 'Chọn nhiều',
            [QuestionType.DRAG_DROP]: 'Kéo thả',
            [QuestionType.ORDERING]: 'Sắp xếp',
            [QuestionType.IMAGE_QUESTION]: 'Có hình',
            [QuestionType.DROPDOWN]: 'Dropdown',
            [QuestionType.UNDERLINE]: 'Gạch chân',
            [QuestionType.CATEGORIZATION]: 'Phân loại',
            [QuestionType.WORD_SCRAMBLE]: 'Ghép chữ',
            [QuestionType.RIDDLE]: 'Câu đố',
            [QuestionType.ERROR_CORRECTION]: 'Tìm từ sai',
        };
        return labels[type] || type;
    };

    return (
        <>
            <Card title="📋 Xem trước đề thi">
                {quiz ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg">{quiz.title}</h3>
                                <p className="text-sm text-gray-500">
                                    Lớp {quiz.classLevel} • {quiz.questions.length} câu • {quiz.timeLimit} phút
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => quiz && generateQuizDocx(quiz)}
                                    variant="secondary"
                                    icon={<FileDown className="w-4 h-4" />}
                                >
                                    Tải file Word
                                </Button>
                                <Button
                                    onClick={onSave}
                                    variant="success"
                                    loading={isSaving}
                                    icon={<Save className="w-4 h-4" />}
                                >
                                    {isSaving ? 'Đang lưu...' : 'Lưu đề'}
                                </Button>
                            </div>
                        </div>

                        <div ref={previewContainerRef} className="border-t pt-4 max-h-[500px] overflow-y-auto space-y-4">
                            {quiz.questions.map((q, idx) => (
                                <div
                                    key={q.id}
                                    className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-default"
                                    onDoubleClick={() => onUpdateQuestions && handleEditQuestion(q)}
                                >
                                    {/* Question Header with Edit/Delete buttons */}
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="flex items-start gap-2 flex-1">
                                            <span className="bg-indigo-100 text-indigo-800 text-sm font-bold px-3 py-1 rounded-lg">
                                                Câu {idx + 1}:
                                            </span>
                                            <div className="flex-1">
                                                <p className="text-gray-800 font-medium" style={{ whiteSpace: 'pre-line' }}>
                                                    <span>{formatMathText(fixReorderQuestion((q as any).question || (q as any).mainQuestion || ''))}</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Edit/Delete/Smart Distractor Buttons */}
                                        {onUpdateQuestions && (
                                            <div className="flex items-center gap-1 relative">
                                                {/* Smart Distractor button - only for MCQ-like types */}
                                                {supportsDistractors(q.type) && (
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowDistractorPopover(showDistractorPopover === q.id ? null : q.id);
                                                            }}
                                                            disabled={generatingDistractorId === q.id}
                                                            className={`p-1.5 rounded-lg transition-colors ${generatingDistractorId === q.id
                                                                ? 'text-purple-400 bg-purple-50 cursor-wait'
                                                                : 'text-purple-500 hover:bg-purple-50'
                                                                }`}
                                                            title="Tạo đáp án nhiễu bằng AI"
                                                        >
                                                            {generatingDistractorId === q.id
                                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                                : <Sparkles className="w-4 h-4" />
                                                            }
                                                        </button>

                                                        {/* Popover to choose distractor count */}
                                                        {showDistractorPopover === q.id && (
                                                            <div
                                                                className="absolute right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-56"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <p className="text-xs font-medium text-gray-600 mb-2">Số đáp án nhiễu:</p>
                                                                <div className="flex gap-1 mb-3">
                                                                    {[2, 3, 4, 5].map(n => (
                                                                        <button
                                                                            key={n}
                                                                            onClick={() => setDistractorCount(n)}
                                                                            className={`w-9 h-9 rounded-lg font-bold text-sm transition-all ${distractorCount === n
                                                                                ? 'bg-purple-500 text-white shadow-md'
                                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                                                }`}
                                                                        >
                                                                            {n}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <button
                                                                    onClick={() => handleGenerateDistractors(q.id, distractorCount)}
                                                                    className="w-full py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-semibold rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all flex items-center justify-center gap-1.5"
                                                                >
                                                                    <Sparkles className="w-3.5 h-3.5" />
                                                                    Tạo {distractorCount} đáp án nhiễu
                                                                </button>
                                                                {distractorError && (
                                                                    <p className="text-xs text-red-500 mt-2">{distractorError}</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Regenerate Single Question Button */}
                                                {onRegenerateQuestion && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRegenerateSingleQuestion(q);
                                                        }}
                                                        disabled={isGeneratingSingle === q.id}
                                                        className={`p-1.5 rounded-lg transition-colors ${isGeneratingSingle === q.id
                                                            ? 'text-blue-400 bg-blue-50 cursor-wait'
                                                            : 'text-blue-500 hover:bg-blue-50'
                                                            }`}
                                                        title="Sinh lại câu hỏi này (AI)"
                                                    >
                                                        {isGeneratingSingle === q.id
                                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                                            : <RefreshCw className="w-4 h-4" />
                                                        }
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleEditQuestion(q)}
                                                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Sửa câu hỏi (nhấp đúp vào thẻ để sửa)"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteQuestion(q.id)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Xóa câu hỏi"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Optional Image Preview for all types (except IMAGE_QUESTION/DROPDOWN) */}
                                    {q.type !== QuestionType.IMAGE_QUESTION &&
                                        q.type !== QuestionType.DROPDOWN && (q as any).image && (
                                            <div className="ml-8 mt-2 mb-3">
                                                <img src={(q as any).image} alt="Attached" className="max-h-32 rounded-lg border object-contain bg-gray-50" />
                                            </div>
                                        )}

                                    {/* MCQ Options */}
                                    {q.type === QuestionType.MCQ && (
                                        <div className="ml-8 space-y-1">
                                            {((q as any).options || []).map((opt: string, i: number) => {
                                                const letter = String.fromCharCode(65 + i);
                                                const isCorrect = letter === (q as any).correctAnswer;
                                                // Strip existing prefix like "A. ", "B. ", "a. ", "a) "
                                                const cleanOpt = opt.replace(/^[A-Da-d][.)]\s*/, '');
                                                return (
                                                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isCorrect ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-600'}`}>
                                                        <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-gray-500'}`}>{letter}.</span>
                                                        <span>{formatMathText(cleanOpt)}</span>
                                                        {isCorrect && <span className="ml-auto text-green-600">✓</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* MULTIPLE_SELECT Options */}
                                    {q.type === QuestionType.MULTIPLE_SELECT && (
                                        <div className="ml-8 space-y-1">
                                            {((q as any).options || []).map((opt: string, i: number) => {
                                                const letter = String.fromCharCode(65 + i);
                                                const isCorrect = ((q as any).correctAnswers || []).includes(letter);
                                                // Strip existing prefix like "A. ", "B. ", "a. ", "a) "
                                                const cleanOpt = opt.replace(/^[A-Da-d][.)]\s*/, '');
                                                return (
                                                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isCorrect ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-600'}`}>
                                                        <span className={`font-bold ${isCorrect ? 'text-green-700' : 'text-gray-500'}`}>{letter}.</span>
                                                        <span>{formatMathText(cleanOpt)}</span>
                                                        {isCorrect && <span className="ml-auto text-green-600">✓</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* TRUE_FALSE Items */}
                                    {q.type === QuestionType.TRUE_FALSE && (
                                        <div className="ml-8 space-y-1">
                                            {((q as any).items || []).map((item: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-lg text-sm">
                                                    <span className="text-gray-700">
                                                        {String.fromCharCode(97 + i)}. {formatMathText(String(item?.statement ?? item?.text ?? item?.content ?? ''))}
                                                    </span>
                                                    <span className={`font-bold px-2 py-0.5 rounded ${toBoolean(item?.isCorrect ?? item?.isTrue ?? item?.correct ?? item?.answer) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {toBoolean(item?.isCorrect ?? item?.isTrue ?? item?.correct ?? item?.answer) ? 'Đ' : 'S'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* SHORT_ANSWER */}
                                    {q.type === QuestionType.SHORT_ANSWER && (
                                        <div className="ml-8">
                                            <p className="text-sm text-gray-600">
                                                Đáp án: <span className="font-bold text-green-700">{formatMathText((q as any).correctAnswer)}</span>
                                            </p>
                                        </div>
                                    )}

                                    {/* MATCHING Pairs */}
                                    {q.type === QuestionType.MATCHING && (
                                        <div className="ml-8 space-y-1">
                                            {((q as any).pairs || []).map((pair: any, i: number) => (
                                                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm">
                                                    <span className="text-gray-800 font-medium">{formatMathText(pair.left)}</span>
                                                    <span className="text-gray-400">→</span>
                                                    <span className="text-green-700 font-semibold">{formatMathText(pair.right)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}



                                    {/* IMAGE_QUESTION */}
                                    {q.type === QuestionType.IMAGE_QUESTION && (
                                        <div className="ml-8 space-y-2">
                                            {(q as any).geometry ? (
                                                typeof (q as any).geometry === 'string' && (q as any).geometry.includes('\\begin{tikzpicture}') ? (
                                                    <TikZPreview code={(q as any).geometry} />
                                                ) : (
                                                    <GeometryPreview data={(q as any).geometry} />
                                                )
                                            ) : (q as any).image && (
                                                (q as any).image.includes('\\begin{tikzpicture}') ? (
                                                    <TikZPreview code={(q as any).image} />
                                                ) : (
                                                    <img src={(q as any).image} alt="Question" className="max-h-32 rounded-lg border" />
                                                )
                                            )}
                                            {((q as any).options || []).map((opt: string, i: number) => {
                                                const letter = String.fromCharCode(65 + i);
                                                const isCorrect = letter === (q as any).correctAnswer;
                                                // Strip existing prefix like "A. ", "B. ", "a. ", "a) "
                                                const cleanOpt = opt.replace(/^[A-Da-d][.)]\s*/, '');
                                                return (
                                                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isCorrect ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-600'}`}>
                                                        <span className="font-bold">{letter}.</span>
                                                        <span>{formatMathText(cleanOpt)}</span>
                                                        {isCorrect && <span className="ml-auto text-green-600">✓</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* DROPDOWN */}
                                    {q.type === QuestionType.DROPDOWN && (
                                        <div className="ml-8 space-y-2">
                                            {(q as any).image && (
                                                <img src={(q as any).image} alt="Question" className="max-h-48 rounded-lg object-contain border" />
                                            )}
                                            <div className="text-sm text-gray-700 leading-relaxed flex flex-wrap items-center gap-y-1">
                                                {((q as any).text || "").split(/(\[\d+\])/g).map((part: string, idx: number) => {
                                                    const match = part.match(/\[(\d+)\]/);
                                                    if (match) {
                                                        const blankIndex = parseInt(match[1]) - 1;
                                                        const blank = ((q as any).blanks || [])[blankIndex];
                                                        if (blank) {
                                                            const options = Array.isArray(blank.options)
                                                                ? blank.options
                                                                : (typeof blank.options === 'string' ? blank.options.split('|') : []);
                                                            const correctAnswer = String(blank.correctAnswer ?? blank.answer ?? blank.correct ?? '');
                                                            return (
                                                                <span key={idx} className="inline-flex items-center mx-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md border border-indigo-200 text-xs font-bold" title={`Options: ${options.join(', ')}`}>
                                                                    ▼ {correctAnswer}
                                                                </span>
                                                            );
                                                        }
                                                    }
                                                    return <span key={idx}>{formatMathText(part)}</span>;
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* UNDERLINE */}
                                    {q.type === QuestionType.UNDERLINE && (
                                        <div className="ml-8 space-y-2">
                                            <p className="text-sm text-gray-600 mb-2">
                                                <strong>Câu:</strong> {(q as any).sentence}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {((q as any).words || []).map((word: string, i: number) => {
                                                    const isCorrect = ((q as any).correctWordIndexes || []).includes(i);
                                                    return (
                                                        <span
                                                            key={i}
                                                            className={`px-2 py-1 rounded text-sm ${isCorrect
                                                                ? 'bg-green-100 text-green-800 font-semibold underline'
                                                                : 'bg-gray-100 text-gray-600'
                                                                }`}
                                                        >
                                                            {word}
                                                            {isCorrect && <span className="ml-1 text-green-600">✓</span>}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* CATEGORIZATION */}
                                    {q.type === QuestionType.CATEGORIZATION && (
                                        <div className="ml-8 space-y-3">
                                            {((q as any).instruction) && (
                                                <p className="text-sm text-amber-700 italic bg-amber-50 p-2 rounded">
                                                    {(q as any).instruction}
                                                </p>
                                            )}
                                            {((q as any).categories || []).map((cat: any) => {
                                                const itemsInCat = ((q as any).items || []).filter((item: any) => item.categoryId === cat.id);
                                                return (
                                                    <div key={cat.id} className="border rounded-lg p-3 bg-gray-50">
                                                        <p className="font-bold text-indigo-700 text-sm mb-2">
                                                            {cat.name}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {itemsInCat.length === 0 ? (
                                                                <span className="text-gray-400 text-xs italic">Không có mục nào</span>
                                                            ) : (
                                                                itemsInCat.map((item: any) => (
                                                                    <span key={item.id} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                                                        {item.content}
                                                                    </span>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {/* Hiển thị items không thuộc nhóm nào */}
                                            {(() => {
                                                const itemsWithNoCategory = ((q as any).items || []).filter((item: any) =>
                                                    !item.categoryId || item.categoryId === ''
                                                );
                                                if (itemsWithNoCategory.length > 0) {
                                                    return (
                                                        <div className="border border-dashed rounded-lg p-3 bg-gray-100">
                                                            <p className="font-bold text-gray-500 text-sm mb-2">Không thuộc nhóm nào:</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {itemsWithNoCategory.map((item: any) => (
                                                                    <span key={item.id} className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs font-medium">
                                                                        {item.content}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    )}

                                    {/* ORDERING */}
                                    {q.type === QuestionType.ORDERING && (
                                        <div className="ml-8 space-y-2">
                                            <p className="text-sm text-gray-500 mb-1">Thứ tự đúng:</p>
                                            <div className="space-y-1">
                                                {(() => {
                                                    const items = (q as any).items || [];
                                                    const correctOrder = (q as any).correctOrder || [];
                                                    return correctOrder.map((idx: number, pos: number) => (
                                                        <div key={pos} className="flex items-center gap-2">
                                                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">{pos + 1}</span>
                                                            <span className="text-sm text-gray-700">{items[idx] || ''}</span>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    )}

                                    {/* DRAG_DROP */}
                                    {q.type === QuestionType.DRAG_DROP && (
                                        <div className="ml-8 space-y-2">
                                            <p className="text-sm text-gray-600">
                                                {((q as any).text || '').replace(/\[([^\]]+)\]/g, '[ ___ ]')}
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                <span className="text-sm text-gray-500 mr-2">Đáp án:</span>
                                                {((q as any).blanks || []).map((blank: string, i: number) => (
                                                    <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                                                        {blank}
                                                    </span>
                                                ))}
                                            </div>
                                            {((q as any).distractors || []).length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    <span className="text-sm text-gray-500 mr-2">Gây nhiễu:</span>
                                                    {((q as any).distractors || []).map((d: string, i: number) => (
                                                        <span key={i} className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs">
                                                            {d}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* WORD_SCRAMBLE */}
                                    {q.type === QuestionType.WORD_SCRAMBLE && (
                                        <div className="ml-8 space-y-2">
                                            <div className="flex flex-wrap gap-1">
                                                <span className="text-sm text-gray-500 mr-2">Chữ cái:</span>
                                                {((q as any).letters || []).map((letter: string, i: number) => (
                                                    <span key={i} className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded font-bold text-sm">
                                                        {letter}
                                                    </span>
                                                ))}
                                            </div>
                                            <p className="text-sm">
                                                <span className="text-gray-500">Đáp án:</span>
                                                <span className="font-bold text-green-700 ml-2">{(q as any).correctWord}</span>
                                            </p>
                                            {(q as any).hint && (
                                                <p className="text-xs text-amber-600 italic">💡 Gợi ý: {(q as any).hint}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* RIDDLE */}
                                    {q.type === QuestionType.RIDDLE && (
                                        <div className="ml-8 space-y-2">
                                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                                                {((q as any).riddleLines || []).map((line: string, i: number) => (
                                                    <p key={i} className="text-amber-900 italic text-sm">{line}</p>
                                                ))}
                                            </div>
                                            <p className="text-sm">
                                                <span className="text-gray-500">{(q as any).answerLabel || 'Đáp án'}:</span>
                                                <span className="font-bold text-green-700 ml-2">{(q as any).correctAnswer}</span>
                                            </p>
                                        </div>
                                    )}

                                    {/* ERROR_CORRECTION */}
                                    {q.type === QuestionType.ERROR_CORRECTION && (
                                        <div className="ml-8 space-y-2">
                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                                <p className="text-sm text-blue-900 whitespace-pre-line">{(q as any).passage}</p>
                                            </div>
                                            <div className="flex gap-4 text-sm">
                                                <p>
                                                    <span className="text-gray-500">Từ sai:</span>
                                                    <span className="font-bold text-red-600 ml-1">{(q as any).wrongWord}</span>
                                                </p>
                                                <p>
                                                    <span className="text-gray-500">Sửa lại:</span>
                                                    <span className="font-bold text-green-700 ml-1">{(q as any).correctWord}</span>
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Question Type Badge + Difficulty Badge */}
                                    <div className="mt-2 ml-8 flex items-center gap-2">
                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                            {getTypeLabel(q.type)}
                                        </span>
                                        {(q as any).difficulty && (
                                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${(q as any).difficulty === 1
                                                ? 'bg-green-100 text-green-700'
                                                : (q as any).difficulty === 2
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-red-100 text-red-700'
                                                }`}>
                                                {(q as any).difficulty === 1 ? '⭐ Mức 1' : (q as any).difficulty === 2 ? '⭐⭐ Mức 2' : '⭐⭐⭐ Mức 3'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Add Question Button */}
                            {onUpdateQuestions && (
                                <div className="mt-4 border-t pt-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium text-gray-600">➕ Thêm câu hỏi:</span>
                                        {[
                                            { type: QuestionType.MCQ, label: 'Trắc nghiệm', emoji: '🔵' },
                                            { type: QuestionType.TRUE_FALSE, label: 'Đúng/Sai', emoji: '✅' },
                                            { type: QuestionType.SHORT_ANSWER, label: 'Điền đáp án', emoji: '✏️' },
                                            { type: QuestionType.MATCHING, label: 'Nối cột', emoji: '🔗' },
                                            { type: QuestionType.MULTIPLE_SELECT, label: 'Chọn nhiều', emoji: '☑️' },
                                            { type: QuestionType.IMAGE_QUESTION, label: 'Có hình', emoji: '🖼️' },
                                            { type: QuestionType.DROPDOWN, label: 'Dropdown', emoji: '📝' },
                                            { type: QuestionType.WORD_SCRAMBLE, label: 'Ghép chữ', emoji: '🔤' },
                                            { type: QuestionType.CATEGORIZATION, label: 'Phân loại', emoji: '📦' },
                                            { type: QuestionType.UNDERLINE, label: 'Gạch chân', emoji: '📋' },
                                            { type: QuestionType.DRAG_DROP, label: 'Kéo thả', emoji: '🎯' },
                                            { type: QuestionType.RIDDLE, label: 'Câu đố', emoji: '🧩' },
                                            { type: QuestionType.ERROR_CORRECTION, label: 'Tìm từ sai', emoji: '🔍' },
                                            { type: QuestionType.ORDERING, label: 'Sắp xếp', emoji: '🔢' },
                                        ].map(item => (
                                            <button
                                                key={item.type}
                                                onClick={() => handleOpenAddModal(item.type)}
                                                className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                                            >
                                                {item.emoji} {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-400">
                        <PlusCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="mb-4">Nhấn "Tạo câu hỏi với AI" để xem trước đề</p>
                        {onCreateManual && (
                            <div className="border-t border-gray-100 pt-4 mt-4">
                                <p className="text-xs text-gray-400 mb-3">Hoặc tạo đề thủ công</p>
                                <button
                                    onClick={onCreateManual}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-semibold text-sm hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    ✍️ Tạo đề thủ công
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Edit Question Modal */}
            {editingQuestion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800">✏️ Sửa câu hỏi</h2>
                            <button
                                onClick={handleCloseEditModal}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Question Text */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nội dung câu hỏi
                                </label>
                                <FormattingToolbar onApply={(tag) => applyFormat(tag, 'question')} />
                                <textarea
                                    ref={editQuestionTextRef}
                                    value={editQuestionText}
                                    onChange={(e) => setEditQuestionText(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                                {/* LaTeX Preview */}
                                {editQuestionText && editQuestionText.includes('$') && (
                                    <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                                        <span className="text-xs text-blue-600 block mb-1">📐 Preview:</span>
                                        <span className="text-gray-800">{formatMathText(editQuestionText)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Optional Image for all types (except IMAGE_QUESTION/DROPDOWN) */}
                            {editingQuestion.type !== QuestionType.IMAGE_QUESTION &&
                                editingQuestion.type !== QuestionType.DROPDOWN && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            🖼️ Hình ảnh đính kèm (Tuỳ chọn)
                                        </label>
                                        <input
                                            type="text"
                                            value={editImageUrl}
                                            onChange={(e) => setEditImageUrl(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                            placeholder="Nhập phần đường link URL ảnh..."
                                        />
                                        {editImageUrl && (
                                            <div className="mt-2">
                                                <img src={editImageUrl} alt="Preview" className="max-h-32 rounded-lg border object-contain bg-gray-50"
                                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                                    onLoad={(e) => (e.target as HTMLImageElement).style.display = 'block'}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                            {/* Options for MCQ */}
                            {(editingQuestion.type === QuestionType.MCQ || editingQuestion.type === QuestionType.MULTIPLE_SELECT) && editOptions.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Các đáp án
                                    </label>
                                    <div className="space-y-2">
                                        {editOptions.map((opt, i) => (
                                            <div key={i} className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 text-center font-bold text-gray-500">
                                                        {String.fromCharCode(65 + i)}.
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={(e) => {
                                                            const newOptions = [...editOptions];
                                                            newOptions[i] = e.target.value;
                                                            setEditOptions(newOptions);
                                                        }}
                                                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    />
                                                    {editOptions.length > 2 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newOptions = editOptions.filter((_, idx) => idx !== i);
                                                                setEditOptions(newOptions);
                                                            }}
                                                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                                                            title="Xóa đáp án"
                                                        >✕</button>
                                                    )}
                                                </div>
                                                {/* Preview if has LaTeX */}
                                                {opt && opt.includes('$') && (
                                                    <div className="ml-8 text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                                        <span>{formatMathText(opt)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {editOptions.length < 8 && (
                                        <button
                                            type="button"
                                            onClick={() => setEditOptions([...editOptions, ''])}
                                            className="mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                        >
                                            + Thêm đáp án {String.fromCharCode(65 + editOptions.length)}
                                        </button>
                                    )}

                                    {/* Smart Distractors button in edit modal */}
                                    {editingQuestion && supportsDistractors(editingQuestion.type) && (
                                        <div className="mt-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-medium text-gray-500">Số đáp án nhiễu:</label>
                                                <div className="flex gap-1">
                                                    {[2, 3, 4, 5].map(n => (
                                                        <button
                                                            key={n}
                                                            onClick={() => setDistractorCount(n)}
                                                            className={`w-7 h-7 rounded-md font-bold text-xs transition-all ${distractorCount === n
                                                                ? 'bg-purple-500 text-white shadow-sm'
                                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                                }`}
                                                        >
                                                            {n}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => editingQuestion && handleGenerateDistractors(editingQuestion.id, distractorCount, true)}
                                                disabled={isGeneratingDistractors || (!editCorrectAnswer && editCorrectAnswers.length === 0)}
                                                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${isGeneratingDistractors || (!editCorrectAnswer && editCorrectAnswers.length === 0)
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 shadow-md hover:shadow-lg'
                                                    }`}
                                            >
                                                {isGeneratingDistractors
                                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tạo...</>
                                                    : <><Sparkles className="w-4 h-4" /> Tạo {distractorCount} đáp án nhiễu bằng AI</>
                                                }
                                            </button>
                                            {!editCorrectAnswer && editCorrectAnswers.length === 0 && (
                                                <p className="text-xs text-amber-600">⚠️ Cần chọn đáp án đúng trước</p>
                                            )}
                                            {distractorError && (
                                                <p className="text-xs text-red-500">❌ {distractorError}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Correct Answer for MCQ/SHORT_ANSWER */}
                            {(editingQuestion.type === QuestionType.MCQ || editingQuestion.type === QuestionType.SHORT_ANSWER) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Đáp án đúng
                                    </label>
                                    <input
                                        type="text"
                                        value={editCorrectAnswer}
                                        onChange={(e) => setEditCorrectAnswer(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder={editingQuestion.type === QuestionType.MCQ ? "A, B, C hoặc D" : "Nhập đáp án"}
                                    />
                                </div>
                            )}

                            {/* RIDDLE Edit */}
                            {editingQuestion.type === QuestionType.RIDDLE && (
                                <div className="space-y-4">
                                    {/* Riddle Lines */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Các dòng câu đố
                                        </label>
                                        <div className="space-y-2">
                                            {editRiddleLines.map((line, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="w-6 text-center text-gray-500 text-sm">{i + 1}.</span>
                                                    <input
                                                        type="text"
                                                        value={line}
                                                        onChange={(e) => {
                                                            const newLines = [...editRiddleLines];
                                                            newLines[i] = e.target.value;
                                                            setEditRiddleLines(newLines);
                                                        }}
                                                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                                                    />
                                                    {editRiddleLines.length > 2 && (
                                                        <button
                                                            onClick={() => {
                                                                const newLines = editRiddleLines.filter((_, idx) => idx !== i);
                                                                setEditRiddleLines(newLines);
                                                            }}
                                                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {editRiddleLines.length < 5 && (
                                                <button
                                                    onClick={() => setEditRiddleLines([...editRiddleLines, ''])}
                                                    className="text-sm text-blue-600 hover:underline"
                                                >
                                                    + Thêm dòng
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Answer Label */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Label câu hỏi (VD: "Từ bỏ sắc", "Từ để nguyên")
                                        </label>
                                        <input
                                            type="text"
                                            value={editAnswerLabel}
                                            onChange={(e) => setEditAnswerLabel(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                                            placeholder="Từ bỏ sắc, Từ để nguyên..."
                                        />
                                    </div>

                                    {/* Correct Answer */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Đáp án đúng (1 tiếng)
                                        </label>
                                        <input
                                            type="text"
                                            value={editCorrectAnswer}
                                            onChange={(e) => setEditCorrectAnswer(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="Nhập đáp án (1 từ)..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* TRUE_FALSE Edit */}
                            {editingQuestion.type === QuestionType.TRUE_FALSE && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Các mệnh đề (Đúng/Sai)
                                    </label>
                                    {editItems.map((item, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                            <span className="text-gray-500 text-sm">{String.fromCharCode(97 + i)}.</span>
                                            <input
                                                type="text"
                                                value={item.statement || item.text || ''}
                                                onChange={(e) => {
                                                    const newItems = [...editItems];
                                                    newItems[i] = { ...newItems[i], statement: e.target.value };
                                                    setEditItems(newItems);
                                                }}
                                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                            <select
                                                value={toBoolean(item.isCorrect ?? item.isTrue ?? item.correct ?? item.answer) ? 'true' : 'false'}
                                                onChange={(e) => {
                                                    const newItems = [...editItems];
                                                    newItems[i] = { ...newItems[i], isCorrect: e.target.value === 'true' };
                                                    setEditItems(newItems);
                                                }}
                                                className="px-2 py-1 border rounded-lg text-sm"
                                            >
                                                <option value="true">Đúng</option>
                                                <option value="false">Sai</option>
                                            </select>
                                            {editItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newItems = editItems.filter((_, idx) => idx !== i);
                                                        setEditItems(newItems);
                                                    }}
                                                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                    title="Xóa mệnh đề"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setEditItems([
                                            ...editItems,
                                            { id: `${Date.now()}`, statement: '', isCorrect: true }
                                        ])}
                                        className="text-sm text-blue-600 hover:underline"
                                    >
                                        + Thêm mệnh đề
                                    </button>
                                </div>
                            )}

                            {/* MATCHING Edit */}
                            {editingQuestion.type === QuestionType.MATCHING && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Các cặp nối
                                    </label>
                                    {editPairs.map((pair, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                            <input
                                                type="text"
                                                value={pair.left || ''}
                                                onChange={(e) => {
                                                    const newPairs = [...editPairs];
                                                    newPairs[i] = { ...newPairs[i], left: e.target.value };
                                                    setEditPairs(newPairs);
                                                }}
                                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="Vế trái"
                                            />
                                            <span className="text-gray-400">→</span>
                                            <input
                                                type="text"
                                                value={pair.right || ''}
                                                onChange={(e) => {
                                                    const newPairs = [...editPairs];
                                                    newPairs[i] = { ...newPairs[i], right: e.target.value };
                                                    setEditPairs(newPairs);
                                                }}
                                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                                placeholder="Vế phải"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* WORD_SCRAMBLE Edit */}
                            {editingQuestion.type === QuestionType.WORD_SCRAMBLE && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Từ đúng
                                        </label>
                                        <input
                                            type="text"
                                            value={editCorrectWord}
                                            onChange={(e) => setEditCorrectWord(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="Nhập từ đúng..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Các chữ cái (đã xáo trộn)
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {editLetters.map((letter, i) => (
                                                <input
                                                    key={i}
                                                    type="text"
                                                    value={letter}
                                                    onChange={(e) => {
                                                        const newLetters = [...editLetters];
                                                        newLetters[i] = e.target.value.slice(0, 1);
                                                        setEditLetters(newLetters);
                                                    }}
                                                    className="w-10 h-10 text-center border rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                                                    maxLength={1}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* MULTIPLE_SELECT correctAnswers */}
                            {editingQuestion.type === QuestionType.MULTIPLE_SELECT && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Đáp án đúng (chọn nhiều)
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {['A', 'B', 'C', 'D'].map((letter) => (
                                            <label key={letter} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={editCorrectAnswers.includes(letter)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setEditCorrectAnswers([...editCorrectAnswers, letter].sort());
                                                        } else {
                                                            setEditCorrectAnswers(editCorrectAnswers.filter(a => a !== letter));
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-green-600"
                                                />
                                                <span className="font-medium">{letter}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* IMAGE_QUESTION Edit */}
                            {editingQuestion.type === QuestionType.IMAGE_QUESTION && (
                                <div className="space-y-4">
                                    {/* Main question image */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            🖼️ URL hình ảnh câu hỏi
                                        </label>
                                        <input
                                            type="text"
                                            value={editImageUrl}
                                            onChange={(e) => setEditImageUrl(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                            placeholder="Nhập URL hoặc Base64..."
                                        />
                                        {editImageUrl && (
                                            <div className="mt-2">
                                                <img src={editImageUrl} alt="Preview" className="max-h-32 rounded-lg border"
                                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    {/* Option images */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            🔗 Link ảnh cho từng đáp án (tùy chọn)
                                        </label>
                                        <p className="text-xs text-gray-500 mb-2">Nếu đáp án là hình ảnh, dán URL ảnh vào ô tương ứng. Để trống nếu đáp án là chữ.</p>
                                        <div className="space-y-2">
                                            {editOptions.map((_, i) => (
                                                <div key={i} className="flex items-start gap-2 border p-3 rounded-lg bg-gray-50">
                                                    <span className="w-6 text-center font-bold text-gray-500 mt-2">
                                                        {String.fromCharCode(65 + i)}.
                                                    </span>
                                                    <div className="flex-1 space-y-2">
                                                        {/* Text Input */}
                                                        <div>
                                                            <label className="text-xs font-semibold text-gray-600 block mb-1">
                                                                Nội dung (Text):
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={editOptions[i] || ''}
                                                                onChange={(e) => {
                                                                    const newOptions = [...editOptions];
                                                                    newOptions[i] = e.target.value;
                                                                    setEditOptions(newOptions);
                                                                }}
                                                                className="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                                placeholder={`Nội dung đáp án ${String.fromCharCode(65 + i)}`}
                                                            />
                                                        </div>

                                                        {/* Image URL Input */}
                                                        <div>
                                                            <label className="text-xs font-semibold text-gray-600 block mb-1">
                                                                Link ảnh (URL) - Tùy chọn:
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={editOptionImages[i] || ''}
                                                                onChange={(e) => {
                                                                    const newImgs = [...editOptionImages];
                                                                    newImgs[i] = e.target.value;
                                                                    setEditOptionImages(newImgs);
                                                                }}
                                                                className="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-teal-500 text-sm font-mono"
                                                                placeholder={`https://...`}
                                                            />
                                                            {editOptionImages[i] && (
                                                                <img src={editOptionImages[i]} alt={`Option ${String.fromCharCode(65 + i)}`}
                                                                    className="mt-2 max-h-24 rounded border bg-white"
                                                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Correct Answer Selector */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ✅ Đáp án đúng
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {editOptions.map((opt, i) => {
                                                const letter = String.fromCharCode(65 + i);
                                                const isCorrect = editCorrectAnswer === letter;
                                                return (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => setEditCorrectAnswer(letter)}
                                                        className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${isCorrect
                                                            ? 'border-green-500 bg-green-50 ring-1 ring-green-400'
                                                            : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCorrect
                                                            ? 'border-green-500 bg-green-500 text-white'
                                                            : 'border-gray-300 text-gray-500'
                                                            }`}>
                                                            {letter}
                                                        </span>
                                                        <span className={`text-sm truncate ${isCorrect ? 'font-semibold text-green-700' : 'text-gray-600'}`}>
                                                            {opt || `Đáp án ${letter}`}
                                                        </span>
                                                        {isCorrect && <span className="ml-auto text-green-600">✓</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {!editCorrectAnswer && (
                                            <p className="text-xs text-red-500 mt-1">⚠️ Chưa chọn đáp án đúng!</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* DRAG_DROP Edit */}
                            {editingQuestion.type === QuestionType.DRAG_DROP && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Đoạn văn (dùng [từ] để đánh dấu chỗ trống)
                                        </label>
                                        <textarea
                                            value={editDragDropText}
                                            onChange={(e) => setEditDragDropText(e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="The sky is [blue] and the grass is [green]."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Các từ đáp án đúng (blanks)
                                        </label>
                                        <div className="space-y-2">
                                            {editBlanks.map((blank, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="w-6 text-center text-gray-500 text-sm">{i + 1}.</span>
                                                    <input
                                                        type="text"
                                                        value={blank}
                                                        onChange={(e) => {
                                                            const newBlanks = [...editBlanks];
                                                            newBlanks[i] = e.target.value;
                                                            setEditBlanks(newBlanks);
                                                        }}
                                                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                                    />
                                                    {editBlanks.length > 1 && (
                                                        <button
                                                            onClick={() => setEditBlanks(editBlanks.filter((_, idx) => idx !== i))}
                                                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                        >✕</button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setEditBlanks([...editBlanks, ''])}
                                                className="text-sm text-blue-600 hover:underline"
                                            >+ Thêm blank</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Từ gây nhiễu (distractors)
                                        </label>
                                        <div className="space-y-2">
                                            {editDistractors.map((dist, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={dist}
                                                        onChange={(e) => {
                                                            const newDist = [...editDistractors];
                                                            newDist[i] = e.target.value;
                                                            setEditDistractors(newDist);
                                                        }}
                                                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                                    />
                                                    <button
                                                        onClick={() => setEditDistractors(editDistractors.filter((_, idx) => idx !== i))}
                                                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                    >✕</button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setEditDistractors([...editDistractors, ''])}
                                                className="text-sm text-orange-600 hover:underline"
                                            >+ Thêm distractor</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ORDERING Edit */}
                            {editingQuestion.type === QuestionType.ORDERING && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Các câu/mục (sửa nội dung và thứ tự đúng)
                                        </label>
                                        <div className="space-y-2">
                                            {editItems.map((item, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={editItems.length}
                                                        value={editCorrectOrder.indexOf(i) + 1 || i + 1}
                                                        onChange={(e) => {
                                                            const newOrder = [...editCorrectOrder];
                                                            const pos = parseInt(e.target.value) - 1;
                                                            // Swap positions
                                                            const oldPos = newOrder.indexOf(i);
                                                            if (oldPos !== -1 && pos >= 0 && pos < editItems.length) {
                                                                const itemAtNewPos = newOrder[pos];
                                                                newOrder[pos] = i;
                                                                newOrder[oldPos] = itemAtNewPos;
                                                                setEditCorrectOrder(newOrder);
                                                            }
                                                        }}
                                                        className="w-12 px-2 py-1 border rounded text-center text-sm"
                                                        title="Thứ tự đúng"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={typeof item === 'string' ? item : item.content || ''}
                                                        onChange={(e) => {
                                                            const newItems = [...editItems];
                                                            newItems[i] = e.target.value;
                                                            setEditItems(newItems);
                                                        }}
                                                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Nhập số thứ tự đúng (1, 2, 3...) vào ô bên trái mỗi câu
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* DROPDOWN Edit */}
                            {editingQuestion.type === QuestionType.DROPDOWN && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Đoạn văn (dùng [1], [2]... để đánh dấu dropdown)
                                        </label>
                                        <div className="mb-2">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Link ảnh minh họa (tùy chọn)
                                            </label>
                                            <input
                                                type="text"
                                                value={editImageUrl}
                                                onChange={(e) => setEditImageUrl(e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                                placeholder="https://example.com/image.jpg"
                                            />
                                        </div>
                                        <textarea
                                            value={editDropdownText}
                                            onChange={(e) => setEditDropdownText(e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="Thủ đô Việt Nam là [1]. Dân số khoảng [2] triệu."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Các dropdown (options và đáp án)
                                        </label>
                                        <div className="space-y-3">
                                            {editDropdownBlanks.map((blank, i) => (
                                                <div key={blank.id || i} className="bg-gray-50 p-3 rounded-lg space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-indigo-600">[{i + 1}]</span>
                                                        <span className="text-xs text-gray-500">Đáp án đúng:</span>
                                                        <select
                                                            value={blank.correctAnswer || ''}
                                                            onChange={(e) => {
                                                                const newBlanks = [...editDropdownBlanks];
                                                                newBlanks[i] = { ...newBlanks[i], correctAnswer: e.target.value };
                                                                setEditDropdownBlanks(newBlanks);
                                                            }}
                                                            className="px-2 py-1 border rounded text-sm"
                                                        >
                                                            {blank.options.map((opt, optIdx) => (
                                                                <option key={optIdx} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                        {editDropdownBlanks.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newBlanks = editDropdownBlanks.filter((_, idx) => idx !== i);
                                                                    setEditDropdownBlanks(newBlanks);
                                                                }}
                                                                className="ml-auto text-red-500 hover:bg-red-50 p-1 rounded"
                                                                title="Xóa ô dropdown"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {blank.options.map((opt, optIdx) => (
                                                            <div key={optIdx} className="flex items-center gap-1">
                                                                <input
                                                                    type="text"
                                                                    value={opt}
                                                                    onChange={(e) => {
                                                                        const newBlanks = [...editDropdownBlanks];
                                                                        const newOpts = [...newBlanks[i].options];
                                                                        const prevOpt = newOpts[optIdx];
                                                                        newOpts[optIdx] = e.target.value;
                                                                        newBlanks[i] = {
                                                                            ...newBlanks[i],
                                                                            options: newOpts,
                                                                            correctAnswer: newBlanks[i].correctAnswer === prevOpt
                                                                                ? e.target.value
                                                                                : newBlanks[i].correctAnswer
                                                                        };
                                                                        setEditDropdownBlanks(newBlanks);
                                                                    }}
                                                                    className="w-24 px-2 py-1 border rounded text-sm"
                                                                />
                                                                {blank.options.length > 2 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newBlanks = [...editDropdownBlanks];
                                                                            const removedOpt = newBlanks[i].options[optIdx];
                                                                            const remainingOptions = blank.options.filter((_, idx) => idx !== optIdx);
                                                                            newBlanks[i] = {
                                                                                ...newBlanks[i],
                                                                                options: remainingOptions,
                                                                                correctAnswer: newBlanks[i].correctAnswer === removedOpt
                                                                                    ? (remainingOptions[0] || '')
                                                                                    : newBlanks[i].correctAnswer
                                                                            };
                                                                            setEditDropdownBlanks(newBlanks);
                                                                        }}
                                                                        className="text-red-400 text-xs"
                                                                    >✕</button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newBlanks = [...editDropdownBlanks];
                                                                newBlanks[i] = {
                                                                    ...newBlanks[i],
                                                                    options: [...blank.options, '']
                                                                };
                                                                setEditDropdownBlanks(newBlanks);
                                                            }}
                                                            className="text-xs text-blue-600"
                                                        >+</button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => setEditDropdownBlanks([
                                                    ...editDropdownBlanks,
                                                    { id: `${Date.now()}`, options: ['', ''], correctAnswer: '' }
                                                ])}
                                                className="text-sm text-blue-600 hover:underline"
                                            >
                                                + Thêm ô dropdown
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* UNDERLINE Edit */}
                            {editingQuestion.type === QuestionType.UNDERLINE && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Câu gốc
                                        </label>
                                        <input
                                            type="text"
                                            value={editSentence}
                                            onChange={(e) => {
                                                setEditSentence(e.target.value);
                                                // Auto-split words
                                                const words = e.target.value.split(/\s+/).filter(w => w.length > 0);
                                                setEditWords(words);
                                                setEditCorrectWordIndexes([]);
                                            }}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="Mặt trời ngả nắng đằng tây"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Click vào từ cần gạch chân
                                        </label>
                                        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                                            {editWords.map((word, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        if (editCorrectWordIndexes.includes(i)) {
                                                            setEditCorrectWordIndexes(editCorrectWordIndexes.filter(idx => idx !== i));
                                                        } else {
                                                            setEditCorrectWordIndexes([...editCorrectWordIndexes, i].sort((a, b) => a - b));
                                                        }
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg transition-all ${editCorrectWordIndexes.includes(i)
                                                        ? 'bg-green-500 text-white underline font-semibold'
                                                        : 'bg-white border hover:bg-gray-100'
                                                        }`}
                                                >
                                                    {word}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Đã chọn: {editCorrectWordIndexes.length > 0
                                                ? editCorrectWordIndexes.map(i => editWords[i]).join(', ')
                                                : 'Chưa chọn từ nào'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* CATEGORIZATION Edit */}
                            {editingQuestion.type === QuestionType.CATEGORIZATION && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Các nhóm/danh mục
                                        </label>
                                        <div className="space-y-2">
                                            {editCategories.map((cat, i) => (
                                                <div key={cat.id} className="flex items-center gap-2">
                                                    <span className="w-6 text-center text-indigo-600 font-bold text-sm">{i + 1}.</span>
                                                    <input
                                                        type="text"
                                                        value={cat.name}
                                                        onChange={(e) => {
                                                            const newCats = [...editCategories];
                                                            newCats[i] = { ...newCats[i], name: e.target.value };
                                                            setEditCategories(newCats);
                                                        }}
                                                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                    {editCategories.length > 1 && (
                                                        <button
                                                            onClick={() => {
                                                                setEditCategories(editCategories.filter((_, idx) => idx !== i));
                                                                // Clear items assigned to this category
                                                                setEditCategorizationItems(
                                                                    editCategorizationItems.map(item =>
                                                                        item.categoryId === cat.id ? { ...item, categoryId: '' } : item
                                                                    )
                                                                );
                                                            }}
                                                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                        >✕</button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setEditCategories([...editCategories, { id: `cat-${Date.now()}`, name: '' }])}
                                                className="text-sm text-indigo-600 hover:underline"
                                            >+ Thêm nhóm</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Các mục cần phân loại
                                        </label>
                                        <div className="space-y-2">
                                            {editCategorizationItems.map((item, i) => (
                                                <div key={item.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                                    <input
                                                        type="text"
                                                        value={item.content}
                                                        onChange={(e) => {
                                                            const newItems = [...editCategorizationItems];
                                                            newItems[i] = { ...newItems[i], content: e.target.value };
                                                            setEditCategorizationItems(newItems);
                                                        }}
                                                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                        placeholder="Nội dung item"
                                                    />
                                                    <span className="text-xs text-gray-400">→</span>
                                                    <select
                                                        value={item.categoryId}
                                                        onChange={(e) => {
                                                            const newItems = [...editCategorizationItems];
                                                            newItems[i] = { ...newItems[i], categoryId: e.target.value };
                                                            setEditCategorizationItems(newItems);
                                                        }}
                                                        className="px-2 py-1 border rounded text-sm min-w-[120px]"
                                                    >
                                                        <option value="">-- Không thuộc nhóm --</option>
                                                        {editCategories.map(cat => (
                                                            <option key={cat.id} value={cat.id}>{cat.name || `Nhóm ${editCategories.indexOf(cat) + 1}`}</option>
                                                        ))}
                                                    </select>
                                                    {editCategorizationItems.length > 1 && (
                                                        <button
                                                            onClick={() => setEditCategorizationItems(editCategorizationItems.filter((_, idx) => idx !== i))}
                                                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                        >✕</button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setEditCategorizationItems([...editCategorizationItems, { id: `item-${Date.now()}`, content: '', categoryId: '' }])}
                                                className="text-sm text-blue-600 hover:underline"
                                            >+ Thêm mục</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ERROR_CORRECTION - Tìm từ sai */}
                            {editingQuestion.type === QuestionType.ERROR_CORRECTION && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Đoạn văn chứa từ sai
                                        </label>
                                        <textarea
                                            value={editPassage}
                                            onChange={(e) => setEditPassage(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                                            rows={4}
                                            placeholder="Nhập đoạn văn/câu chứa từ viết sai..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                🔴 Từ sai
                                            </label>
                                            <input
                                                type="text"
                                                value={editWrongWord}
                                                onChange={(e) => setEditWrongWord(e.target.value)}
                                                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-red-50"
                                                placeholder="Từ viết sai trong đoạn văn"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                🟢 Từ đúng
                                            </label>
                                            <input
                                                type="text"
                                                value={editCorrectWord2}
                                                onChange={(e) => setEditCorrectWord2(e.target.value)}
                                                className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-green-50"
                                                placeholder="Từ đúng (sửa lại)"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Difficulty Level Selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mức độ khó
                                </label>
                                <select
                                    value={editDifficulty ?? ''}
                                    onChange={(e) => setEditDifficulty(e.target.value ? Number(e.target.value) as 1 | 2 | 3 : undefined)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                >
                                    <option value="">-- Chưa chọn --</option>
                                    <option value="1">⭐ Mức 1 - Nhận biết (Dễ)</option>
                                    <option value="2">⭐⭐ Mức 2 - Thông hiểu (Trung bình)</option>
                                    <option value="3">⭐⭐⭐ Mức 3 - Vận dụng cao (Khó)</option>
                                </select>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={handleCloseEditModal}
                                    variant="secondary"
                                    className="flex-1"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleSaveEditedQuestion}
                                    variant="primary"
                                    className="flex-1"
                                >
                                    💾 Lưu thay đổi
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Question Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-800">➕ Thêm câu hỏi {getTypeLabel(newQuestionType)}</h2>
                            <button
                                onClick={() => { setShowAddModal(false); handleCloseEditModal(); }}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Question Text */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nội dung câu hỏi
                                </label>
                                <textarea
                                    value={editQuestionText}
                                    onChange={(e) => setEditQuestionText(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Nhập câu hỏi..."
                                />
                            </div>

                            {/* Optional Image for all types (except IMAGE_QUESTION/DROPDOWN) */}
                            {newQuestionType !== QuestionType.IMAGE_QUESTION &&
                                newQuestionType !== QuestionType.DROPDOWN && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            🖼️ Hình ảnh đính kèm (Tuỳ chọn)
                                        </label>
                                        <input
                                            type="text"
                                            value={editImageUrl}
                                            onChange={(e) => setEditImageUrl(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                            placeholder="Nhập đường link URL ảnh..."
                                        />
                                        {editImageUrl && (
                                            <div className="mt-2">
                                                <img src={editImageUrl} alt="Preview" className="max-h-32 rounded-lg border object-contain bg-gray-50"
                                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                                    onLoad={(e) => (e.target as HTMLImageElement).style.display = 'block'}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                            {(newQuestionType === QuestionType.MCQ || newQuestionType === QuestionType.MULTIPLE_SELECT) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Các đáp án
                                    </label>
                                    <div className="space-y-2">
                                        {editOptions.map((opt, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="w-6 text-center font-bold text-gray-500">
                                                    {String.fromCharCode(65 + i)}.
                                                </span>
                                                <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => {
                                                        const newOptions = [...editOptions];
                                                        newOptions[i] = e.target.value;
                                                        setEditOptions(newOptions);
                                                    }}
                                                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    placeholder={`Đáp án ${String.fromCharCode(65 + i)}`}
                                                />
                                                {newQuestionType === QuestionType.MULTIPLE_SELECT && (
                                                    <input
                                                        type="checkbox"
                                                        checked={editCorrectAnswers.includes(String.fromCharCode(65 + i))}
                                                        onChange={(e) => {
                                                            const letter = String.fromCharCode(65 + i);
                                                            if (e.target.checked) {
                                                                setEditCorrectAnswers([...editCorrectAnswers, letter].sort());
                                                            } else {
                                                                setEditCorrectAnswers(editCorrectAnswers.filter(a => a !== letter));
                                                            }
                                                        }}
                                                        className="w-5 h-5 text-green-600"
                                                        title="Đáp án đúng"
                                                    />
                                                )}
                                                {editOptions.length > 2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newOptions = editOptions.filter((_, idx) => idx !== i);
                                                            setEditOptions(newOptions);
                                                            // Clean up correctAnswers that reference removed indices
                                                            const removedLetter = String.fromCharCode(65 + i);
                                                            setEditCorrectAnswers(editCorrectAnswers.filter(a => a !== removedLetter));
                                                        }}
                                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                                                        title="Xóa đáp án"
                                                    >✕</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {editOptions.length < 8 && (
                                        <button
                                            type="button"
                                            onClick={() => setEditOptions([...editOptions, ''])}
                                            className="mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                        >
                                            + Thêm đáp án {String.fromCharCode(65 + editOptions.length)}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Correct Answer for MCQ/SHORT_ANSWER */}
                            {(newQuestionType === QuestionType.MCQ || newQuestionType === QuestionType.SHORT_ANSWER) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Đáp án đúng
                                    </label>
                                    <input
                                        type="text"
                                        value={editCorrectAnswer}
                                        onChange={(e) => setEditCorrectAnswer(newQuestionType === QuestionType.MCQ ? e.target.value.toUpperCase() : e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder={newQuestionType === QuestionType.MCQ ? "A, B, C hoặc D" : "Nhập đáp án"}
                                    />
                                </div>
                            )}

                            {/* TRUE_FALSE Items */}
                            {newQuestionType === QuestionType.TRUE_FALSE && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Các mệnh đề
                                    </label>
                                    <div className="space-y-2">
                                        {editItems.map((item, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="w-6 text-center text-gray-500">{String.fromCharCode(97 + i)}.</span>
                                                <input
                                                    type="text"
                                                    value={item.statement}
                                                    onChange={(e) => {
                                                        const newItems = [...editItems];
                                                        newItems[i] = { ...newItems[i], statement: e.target.value };
                                                        setEditItems(newItems);
                                                    }}
                                                    className="flex-1 px-3 py-2 border rounded-lg"
                                                    placeholder="Nhập mệnh đề..."
                                                />
                                                <select
                                                    value={item.isCorrect ? 'true' : 'false'}
                                                    onChange={(e) => {
                                                        const newItems = [...editItems];
                                                        newItems[i] = { ...newItems[i], isCorrect: e.target.value === 'true' };
                                                        setEditItems(newItems);
                                                    }}
                                                    className="px-2 py-2 border rounded-lg"
                                                >
                                                    <option value="true">Đúng</option>
                                                    <option value="false">Sai</option>
                                                </select>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setEditItems([...editItems, { id: `${editItems.length + 1}`, statement: '', isCorrect: true }])}
                                            className="text-sm text-blue-600 hover:underline"
                                        >
                                            + Thêm mệnh đề
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* MATCHING Pairs */}
                            {newQuestionType === QuestionType.MATCHING && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Các cặp nối
                                    </label>
                                    <div className="space-y-2">
                                        {editPairs.map((pair, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={pair.left}
                                                    onChange={(e) => {
                                                        const newPairs = [...editPairs];
                                                        newPairs[i] = { ...newPairs[i], left: e.target.value };
                                                        setEditPairs(newPairs);
                                                    }}
                                                    className="flex-1 px-3 py-2 border rounded-lg"
                                                    placeholder="Cột A"
                                                />
                                                <span className="text-gray-400">→</span>
                                                <input
                                                    type="text"
                                                    value={pair.right}
                                                    onChange={(e) => {
                                                        const newPairs = [...editPairs];
                                                        newPairs[i] = { ...newPairs[i], right: e.target.value };
                                                        setEditPairs(newPairs);
                                                    }}
                                                    className="flex-1 px-3 py-2 border rounded-lg"
                                                    placeholder="Cột B"
                                                />
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setEditPairs([...editPairs, { left: '', right: '' }])}
                                            className="text-sm text-blue-600 hover:underline"
                                        >
                                            + Thêm cặp nối
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* IMAGE_QUESTION */}
                            {newQuestionType === QuestionType.IMAGE_QUESTION && (
                                <div className="space-y-4">
                                    {/* Image URL */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            🖼️ URL hình ảnh câu hỏi
                                        </label>
                                        <input
                                            type="text"
                                            value={editImageUrl}
                                            onChange={(e) => setEditImageUrl(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="https://example.com/image.png hoặc data:image/..."
                                        />
                                        {editImageUrl && (
                                            <div className="mt-2">
                                                <img src={editImageUrl} alt="Preview" className="max-h-32 rounded-lg border"
                                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Combined Options & Correct Answer UI */}
                                    <div className="mt-6 border-t pt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-3">
                                            ✅ Chọn đáp án đúng:
                                        </label>
                                        <div className="flex flex-wrap gap-4 mb-6">
                                            {editOptions.map((_, i) => {
                                                const label = String.fromCharCode(65 + i);
                                                return (
                                                    <label key={i} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all ${editCorrectAnswer === label
                                                        ? 'bg-green-100 border-green-500 text-green-800 font-bold shadow-sm'
                                                        : 'bg-white hover:bg-gray-50 border-gray-200'
                                                        }`}>
                                                        <input
                                                            type="radio"
                                                            name="correctAnswer"
                                                            checked={editCorrectAnswer === label}
                                                            onChange={() => setEditCorrectAnswer(label)}
                                                            className="w-4 h-4 text-green-600 focus:ring-green-500"
                                                        />
                                                        <span>Đáp án {label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        <label className="block text-sm font-medium text-gray-700 mb-3">
                                            📝 Chi tiết các lựa chọn (Nhập chữ hoặc Link ảnh):
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {editOptions.map((opt, i) => {
                                                const label = String.fromCharCode(65 + i);
                                                return (
                                                    <div key={i} className={`p-4 rounded-xl border-2 transition-all ${editCorrectAnswer === label ? 'border-green-400 bg-green-50/30' : 'border-gray-100 bg-gray-50'
                                                        }`}>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="font-bold text-gray-700 flex items-center gap-2">
                                                                <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                                                    {label}
                                                                </span>
                                                                Lựa chọn {label}
                                                            </div>
                                                            {editCorrectAnswer === label && (
                                                                <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">ĐÁP ÁN ĐÚNG</span>
                                                            )}
                                                        </div>

                                                        <div className="space-y-3">
                                                            <div>
                                                                <label className="text-xs text-gray-500 block mb-1">Nội dung chữ (Text)</label>
                                                                <input
                                                                    type="text"
                                                                    value={opt}
                                                                    onChange={(e) => {
                                                                        const newOptions = [...editOptions];
                                                                        newOptions[i] = e.target.value;
                                                                        setEditOptions(newOptions);
                                                                    }}
                                                                    className="w-full px-3 py-2 border rounded bg-white focus:ring-1 focus:ring-orange-300"
                                                                    placeholder={`Nội dung ${label}...`}
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="text-xs text-gray-500 block mb-1">Link ảnh (URL) - Tùy chọn</label>
                                                                <input
                                                                    type="text"
                                                                    value={editOptionImages[i] || ''}
                                                                    onChange={(e) => {
                                                                        const newImgs = [...editOptionImages];
                                                                        newImgs[i] = e.target.value;
                                                                        setEditOptionImages(newImgs);
                                                                    }}
                                                                    className="w-full px-3 py-2 border rounded bg-white focus:ring-1 focus:ring-blue-300 font-mono text-xs"
                                                                    placeholder="https://..."
                                                                />
                                                                {editOptionImages[i] && (
                                                                    <img
                                                                        src={editOptionImages[i]}
                                                                        alt={`Option ${label}`}
                                                                        className="mt-2 w-full h-32 object-contain rounded border bg-white"
                                                                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DROPDOWN */}
                            {newQuestionType === QuestionType.DROPDOWN && (
                                <div className="space-y-4">
                                    <div>
                                        <div className="mb-2">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Link ảnh minh họa (tùy chọn)
                                            </label>
                                            <input
                                                type="text"
                                                value={editImageUrl}
                                                onChange={(e) => setEditImageUrl(e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                                placeholder="https://example.com/image.jpg"
                                            />
                                        </div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Câu văn (dùng [blank] để đánh dấu chỗ trống)
                                        </label>
                                        <textarea
                                            value={editDropdownText}
                                            onChange={(e) => setEditDropdownText(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg"
                                            placeholder="Ví dụ: Con [blank] là động vật có vú."
                                            rows={2}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Các ô dropdown
                                        </label>
                                        {editDropdownBlanks.map((blank, i) => (
                                            <div key={i} className="mb-3 p-3 bg-gray-50 rounded-lg">
                                                <p className="text-xs text-gray-500 mb-2">Ô {i + 1}</p>
                                                <input
                                                    type="text"
                                                    value={blank.options.join(', ')}
                                                    onChange={(e) => {
                                                        const newBlanks = [...editDropdownBlanks];
                                                        newBlanks[i] = { ...blank, options: e.target.value.split(',').map(s => s.trim()) };
                                                        setEditDropdownBlanks(newBlanks);
                                                    }}
                                                    className="w-full px-3 py-2 border rounded-lg mb-2"
                                                    placeholder="Các lựa chọn (cách nhau bởi dấu phẩy)"
                                                />
                                                <input
                                                    type="text"
                                                    value={blank.correctAnswer}
                                                    onChange={(e) => {
                                                        const newBlanks = [...editDropdownBlanks];
                                                        newBlanks[i] = { ...blank, correctAnswer: e.target.value };
                                                        setEditDropdownBlanks(newBlanks);
                                                    }}
                                                    className="w-full px-3 py-2 border rounded-lg"
                                                    placeholder="Đáp án đúng"
                                                />
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setEditDropdownBlanks([...editDropdownBlanks, { id: `${editDropdownBlanks.length + 1}`, options: [], correctAnswer: '' }])}
                                            className="text-sm text-blue-600 hover:underline"
                                        >
                                            + Thêm ô dropdown
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* WORD_SCRAMBLE */}
                            {newQuestionType === QuestionType.WORD_SCRAMBLE && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Từ đúng
                                        </label>
                                        <input
                                            type="text"
                                            value={editCorrectWord}
                                            onChange={(e) => {
                                                const word = e.target.value.toUpperCase();
                                                setEditCorrectWord(word);
                                                // Auto-generate shuffled letters
                                                const letters = word.split('').sort(() => Math.random() - 0.5);
                                                setEditLetters(letters);
                                            }}
                                            className="w-full px-3 py-2 border rounded-lg"
                                            placeholder="Nhập từ cần ghép (VD: TRƯỜNG)"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Các chữ cái (xáo trộn)
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {editLetters.map((letter, i) => (
                                                <span key={i} className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded font-bold">
                                                    {letter}
                                                </span>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setEditLetters([...editLetters].sort(() => Math.random() - 0.5))}
                                            className="text-sm text-blue-600 hover:underline mt-2"
                                        >
                                            🔀 Xáo trộn lại
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* CATEGORIZATION */}
                            {newQuestionType === QuestionType.CATEGORIZATION && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Các nhóm/danh mục
                                        </label>
                                        {editCategories.map((cat, i) => (
                                            <div key={i} className="flex items-center gap-2 mb-2">
                                                <span className="text-gray-500">{i + 1}.</span>
                                                <input
                                                    type="text"
                                                    value={cat.name}
                                                    onChange={(e) => {
                                                        const newCats = [...editCategories];
                                                        newCats[i] = { ...cat, name: e.target.value };
                                                        setEditCategories(newCats);
                                                    }}
                                                    className="flex-1 px-3 py-2 border rounded-lg"
                                                    placeholder={`Nhóm ${i + 1}`}
                                                />
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setEditCategories([...editCategories, { id: `${Date.now()}`, name: '' }])}
                                            className="text-sm text-blue-600 hover:underline"
                                        >
                                            + Thêm nhóm
                                        </button>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Các mục cần phân loại
                                        </label>
                                        {editCategorizationItems.map((item, i) => (
                                            <div key={i} className="flex items-center gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={item.content}
                                                    onChange={(e) => {
                                                        const newItems = [...editCategorizationItems];
                                                        newItems[i] = { ...item, content: e.target.value };
                                                        setEditCategorizationItems(newItems);
                                                    }}
                                                    className="flex-1 px-3 py-2 border rounded-lg"
                                                    placeholder="Nội dung mục"
                                                />
                                                <select
                                                    value={item.categoryId}
                                                    onChange={(e) => {
                                                        const newItems = [...editCategorizationItems];
                                                        newItems[i] = { ...item, categoryId: e.target.value };
                                                        setEditCategorizationItems(newItems);
                                                    }}
                                                    className="px-2 py-2 border rounded-lg"
                                                >
                                                    {editCategories.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.name || `Nhóm ${editCategories.indexOf(cat) + 1}`}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setEditCategorizationItems([...editCategorizationItems, { id: `${Date.now()}`, content: '', categoryId: editCategories[0]?.id || '' }])}
                                            className="text-sm text-blue-600 hover:underline"
                                        >
                                            + Thêm mục
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* UNDERLINE */}
                            {newQuestionType === QuestionType.UNDERLINE && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Câu văn (các từ sẽ được tách tự động)
                                        </label>
                                        <textarea
                                            value={editSentence}
                                            onChange={(e) => {
                                                const sentence = e.target.value;
                                                setEditSentence(sentence);
                                                setEditWords(sentence.split(/\s+/).filter(w => w.trim()));
                                                setEditCorrectWordIndexes([]);
                                            }}
                                            className="w-full px-3 py-2 border rounded-lg"
                                            placeholder="Nhập câu văn..."
                                            rows={2}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Click vào từ cần gạch chân (đáp án đúng)
                                        </label>
                                        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                                            {editWords.map((word, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        if (editCorrectWordIndexes.includes(i)) {
                                                            setEditCorrectWordIndexes(editCorrectWordIndexes.filter(idx => idx !== i));
                                                        } else {
                                                            setEditCorrectWordIndexes([...editCorrectWordIndexes, i]);
                                                        }
                                                    }}
                                                    className={`px-2 py-1 rounded text-sm transition-colors ${editCorrectWordIndexes.includes(i)
                                                        ? 'bg-green-500 text-white underline'
                                                        : 'bg-gray-200 hover:bg-gray-300'
                                                        }`}
                                                >
                                                    {word}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DRAG_DROP */}
                            {newQuestionType === QuestionType.DRAG_DROP && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Đoạn văn (dùng [từ] để đánh dấu chỗ trống)
                                        </label>
                                        <textarea
                                            value={editDragDropText}
                                            onChange={(e) => {
                                                const text = e.target.value;
                                                setEditDragDropText(text);
                                                const matches = text.match(/\[([^\]]+)\]/g);
                                                if (matches) {
                                                    setEditBlanks(matches.map(m => m.replace(/[\[\]]/g, '')));
                                                }
                                            }}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="VD: Bầu trời màu [xanh] và cỏ màu [xanh lá]."
                                            rows={3}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Các từ đáp án đúng (tự động trích từ [từ])
                                        </label>
                                        <div className="space-y-2">
                                            {editBlanks.map((blank, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="w-6 text-center text-gray-500 text-sm">{i + 1}.</span>
                                                    <input
                                                        type="text"
                                                        value={blank}
                                                        onChange={(e) => {
                                                            const newBlanks = [...editBlanks];
                                                            newBlanks[i] = e.target.value;
                                                            setEditBlanks(newBlanks);
                                                        }}
                                                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                                    />
                                                    {editBlanks.length > 1 && (
                                                        <button
                                                            onClick={() => setEditBlanks(editBlanks.filter((_, idx) => idx !== i))}
                                                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                        >✕</button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setEditBlanks([...editBlanks, ''])}
                                                className="text-sm text-blue-600 hover:underline"
                                            >+ Thêm blank</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Từ gây nhiễu (distractors)
                                        </label>
                                        <div className="space-y-2">
                                            {editDistractors.map((d, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={d}
                                                        onChange={(e) => {
                                                            const newD = [...editDistractors];
                                                            newD[i] = e.target.value;
                                                            setEditDistractors(newD);
                                                        }}
                                                        className="flex-1 px-3 py-2 border rounded-lg"
                                                        placeholder="Từ gây nhiễu..."
                                                    />
                                                    <button
                                                        onClick={() => setEditDistractors(editDistractors.filter((_, idx) => idx !== i))}
                                                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                    >✕</button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setEditDistractors([...editDistractors, ''])}
                                                className="text-sm text-blue-600 hover:underline"
                                            >+ Thêm từ gây nhiễu</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RIDDLE */}
                            {newQuestionType === QuestionType.RIDDLE && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Các dòng câu đố
                                        </label>
                                        <div className="space-y-2">
                                            {editRiddleLines.map((line, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="w-6 text-center text-gray-500 text-sm">{i + 1}.</span>
                                                    <input
                                                        type="text"
                                                        value={line}
                                                        onChange={(e) => {
                                                            const newLines = [...editRiddleLines];
                                                            newLines[i] = e.target.value;
                                                            setEditRiddleLines(newLines);
                                                        }}
                                                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                                                        placeholder={`Dòng ${i + 1} của câu đố...`}
                                                    />
                                                    {editRiddleLines.length > 1 && (
                                                        <button
                                                            onClick={() => setEditRiddleLines(editRiddleLines.filter((_, idx) => idx !== i))}
                                                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                        >✕</button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setEditRiddleLines([...editRiddleLines, ''])}
                                                className="text-sm text-blue-600 hover:underline"
                                            >+ Thêm dòng</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nhãn đáp án
                                        </label>
                                        <input
                                            type="text"
                                            value={editAnswerLabel}
                                            onChange={(e) => setEditAnswerLabel(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
                                            placeholder="VD: Từ giữ nguyên là từ gì?"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Đáp án đúng
                                        </label>
                                        <input
                                            type="text"
                                            value={editCorrectAnswer}
                                            onChange={(e) => setEditCorrectAnswer(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                            placeholder="Nhập đáp án..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ORDERING */}
                            {newQuestionType === QuestionType.ORDERING && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Các câu / mục cần sắp xếp (nhập theo THỨ TỰ ĐÚNG)
                                        </label>
                                        <div className="space-y-2">
                                            {editItems.map((item, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                                                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                                        {i + 1}
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={typeof item === 'string' ? item : ''}
                                                        onChange={(e) => {
                                                            const newItems = [...editItems];
                                                            newItems[i] = e.target.value;
                                                            setEditItems(newItems);
                                                            // Keep correctOrder in sync
                                                            if (editCorrectOrder.length !== newItems.length) {
                                                                setEditCorrectOrder(newItems.map((_, idx) => idx));
                                                            }
                                                        }}
                                                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                        placeholder={`Câu ${i + 1}...`}
                                                    />
                                                    {editItems.length > 2 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newItems = editItems.filter((_, idx) => idx !== i);
                                                                setEditItems(newItems);
                                                                setEditCorrectOrder(newItems.map((_, idx) => idx));
                                                            }}
                                                            className="text-red-400 hover:text-red-600 text-lg"
                                                            title="Xóa câu này"
                                                        >✕</button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newItems = [...editItems, ''];
                                                setEditItems(newItems);
                                                setEditCorrectOrder(newItems.map((_, idx) => idx));
                                            }}
                                            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                        >
                                            ➕ Thêm câu
                                        </button>
                                        <p className="text-xs text-gray-500 mt-2">
                                            💡 Nhập các câu theo thứ tự đúng. Khi hiển thị cho học sinh, các câu sẽ được xáo trộn tự động.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ERROR_CORRECTION */}
                            {newQuestionType === QuestionType.ERROR_CORRECTION && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Đoạn văn / đoạn thơ (chứa từ sai)
                                        </label>
                                        <textarea
                                            value={editPassage}
                                            onChange={(e) => setEditPassage(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="VD: Ngày đẹp lắm bạn ơi&#10;Nắng vàng chải khắp nơi&#10;Chim ca trong bóng lá&#10;Ra sân ta cùng chơi."
                                            rows={5}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Từ viết sai
                                            </label>
                                            <input
                                                type="text"
                                                value={editWrongWord}
                                                onChange={(e) => setEditWrongWord(e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                                                placeholder="VD: chải"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Sửa lại là
                                            </label>
                                            <input
                                                type="text"
                                                value={editCorrectWord2}
                                                onChange={(e) => setEditCorrectWord2(e.target.value)}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                                placeholder="VD: trải"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Difficulty Level Selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mức độ khó
                                </label>
                                <select
                                    value={editDifficulty ?? ''}
                                    onChange={(e) => setEditDifficulty(e.target.value ? Number(e.target.value) as 1 | 2 | 3 : undefined)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                >
                                    <option value="">-- Chưa chọn --</option>
                                    <option value="1">⭐ Mức 1 - Nhận biết (Dễ)</option>
                                    <option value="2">⭐⭐ Mức 2 - Thông hiểu (Trung bình)</option>
                                    <option value="3">⭐⭐⭐ Mức 3 - Vận dụng cao (Khó)</option>
                                </select>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={() => { setShowAddModal(false); handleCloseEditModal(); }}
                                    variant="secondary"
                                    className="flex-1"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleAddQuestion}
                                    variant="primary"
                                    className="flex-1"
                                    disabled={!editQuestionText.trim()}
                                >
                                    ➕ Thêm câu hỏi
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default QuizPreview;

