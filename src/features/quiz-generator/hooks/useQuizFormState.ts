import { useEffect, useRef, useState } from 'react';
import type { ImageLibraryItem, Quiz } from '../../../types';
import type {
    AIProvider,
    LearnerPromptMode,
    PromptProfileOptions,
} from '../../../services/geminiService';
import { normalizeAiCategory, normalizeTagValue, normalizeTags } from '../utils/quizNormalizers';
import {
    createDefaultDeadline,
    createDefaultDifficultyLevels,
    createDefaultExpandedSections,
    createDefaultSelectedTypes,
    createPromptProfile,
    createRandomAccessCode,
    DEFAULT_PROMPT_PROFILE,
    getPromptProfileNotice,
    parseQuizTags,
    resolvePromptProfilePreset,
} from '../domain/quizCreationDefaults';
import type {
    DifficultyLevels,
    ExpandedSections,
    QuizMode,
    TrangNguyenSearchMode,
} from '../domain/quizCreation.types';
import { useGeneratedQuizSync } from './useGeneratedQuizSync';

interface UseQuizFormStateOptions {
    editingQuiz: Quiz | null;
    isClassLocked: boolean;
    lockedClass: string;
    teacherName: string | null;
}

export const useQuizFormState = ({
    editingQuiz,
    isClassLocked,
    lockedClass,
    teacherName,
}: UseQuizFormStateOptions) => {
    const [topic, setTopic] = useState('');
    const [quizTitle, setQuizTitle] = useState('');
    const [classLevel, setClassLevel] = useState(isClassLocked ? lockedClass : '3');
    const [category, setCategory] = useState('toan');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [aiDetectedCategory, setAiDetectedCategory] = useState<string | null>(null);
    const [aiDetectedLesson, setAiDetectedLesson] = useState('');
    const [aiSuggestedTags, setAiSuggestedTags] = useState<string[]>([]);
    const [content, setContent] = useState('');
    const [manualTimeLimit, setManualTimeLimit] = useState<number | ''>('');
    const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [customPrompt, setCustomPrompt] = useState('');
    const [quizMode, setQuizMode] = useState<QuizMode>('practice');
    const [aiProvider, setAiProvider] = useState<AIProvider>(() =>
        (localStorage.getItem('ai_provider') as AIProvider) || 'llm-mux'
    );
    const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>(
        createDefaultSelectedTypes,
    );
    const [difficultyLevels, setDifficultyLevels] = useState<DifficultyLevels>(
        createDefaultDifficultyLevels,
    );
    const [promptProfile, setPromptProfile] = useState<PromptProfileOptions>(DEFAULT_PROMPT_PROFILE);
    const [profilePresetNotice, setProfilePresetNotice] = useState<string | null>(null);
    const [requireCode, setRequireCode] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [showOnHome, setShowOnHome] = useState(true);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [expandedSections, setExpandedSections] = useState<ExpandedSections>(
        createDefaultExpandedSections,
    );
    const [imageLibrary, setImageLibrary] = useState<ImageLibraryItem[]>(() => {
        const saved = localStorage.getItem('quiz_image_library');
        return saved ? JSON.parse(saved) : [];
    });
    const [assignToClass, setAssignToClass] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [deadline, setDeadline] = useState(createDefaultDeadline);
    const [maxAttempts, setMaxAttempts] = useState(3);
    const [tnSearchMode, setTnSearchMode] = useState<TrangNguyenSearchMode>('search');

    const toggleSection = (section: string) => {
        setExpandedSections((previous) => ({
            ...previous,
            [section]: !previous[section],
        }));
    };

    const applyPromptProfilePreset = (nextProfile: PromptProfileOptions) => {
        setPromptProfile(nextProfile);
        if (!nextProfile.useThongTu27) {
            setProfilePresetNotice(null);
            return;
        }

        const totalQuestions = difficultyLevels.level1
            + difficultyLevels.level2
            + difficultyLevels.level3;
        const { levels, presetLabel } = resolvePromptProfilePreset(totalQuestions, nextProfile);
        setDifficultyLevels(levels);
        setProfilePresetNotice(getPromptProfileNotice(presetLabel));
    };

    const handleToggleThongTu27 = () => {
        if (promptProfile.useThongTu27) {
            setPromptProfile(DEFAULT_PROMPT_PROFILE);
            setProfilePresetNotice(null);
            return;
        }
        applyPromptProfilePreset(createPromptProfile('default'));
    };

    const handleSelectLearnerMode = (learnerMode: LearnerPromptMode) => {
        if (!promptProfile.useThongTu27) return;
        applyPromptProfilePreset(createPromptProfile(learnerMode));
    };

    const generateRandomCode = () => {
        const code = createRandomAccessCode();
        setAccessCode(code);
        return code;
    };

    const addTagToState = (rawValue: string) => {
        const normalizedTag = normalizeTagValue(rawValue);
        if (!normalizedTag) return;
        setTags((previous) => {
            const normalizedExisting = new Set(
                previous.map((tag) => normalizeTagValue(tag)),
            );
            return normalizedExisting.has(normalizedTag)
                ? previous
                : [...previous, normalizedTag];
        });
    };

    const handleApplyAiCategory = () => {
        if (aiDetectedCategory) setCategory(aiDetectedCategory);
    };

    const handleApplyAiTitleSuggestion = () => {
        if (aiDetectedLesson) setQuizTitle(aiDetectedLesson);
    };

    const resetAfterSave = () => {
        setTopic('');
        setQuizTitle('');
        setContent('');
        setCustomPrompt('');
        setRequireCode(false);
        setAccessCode('');
        setShowOnHome(true);
        setUploadedFile(null);
        setGeneratedQuiz(null);
        setTags([]);
        setTagInput('');
        setAiDetectedCategory(null);
        setAiDetectedLesson('');
        setAiSuggestedTags([]);
        setPromptProfile(DEFAULT_PROMPT_PROFILE);
        setProfilePresetNotice(null);
    };

    const handleStartManual = () => {
        const quiz: Quiz = {
            id: editingQuiz?.id || `quiz-manual-${Date.now()}`,
            title: quizTitle || 'Đề thi mới (Chưa đặt tên)',
            classLevel: classLevel || '3',
            timeLimit: typeof manualTimeLimit === 'number' ? manualTimeLimit : 15,
            questions: [],
            createdAt: editingQuiz ? editingQuiz.createdAt : new Date().toISOString(),
            createdBy: editingQuiz?.createdBy || teacherName || undefined,
            accessCode: requireCode ? accessCode.toUpperCase() : undefined,
            requireCode,
            showOnHome,
            category,
            tags,
            detectedCategory: aiDetectedCategory || undefined,
            detectedLesson: aiDetectedLesson || undefined,
            suggestedTags: aiSuggestedTags.length > 0 ? aiSuggestedTags : undefined,
        };
        setGeneratedQuiz(quiz);
    };

    useEffect(() => {
        if (editingQuiz) {
            setTopic('');
            setQuizTitle(editingQuiz.title);
            setClassLevel(editingQuiz.classLevel);
            setContent('');
            setManualTimeLimit(editingQuiz.timeLimit);
            setGeneratedQuiz(editingQuiz);
            setRequireCode(!!editingQuiz.requireCode);
            setAccessCode(editingQuiz.accessCode || '');
            setShowOnHome(editingQuiz.showOnHome !== false);
            setCategory(editingQuiz.category || 'toan');
            setTags(parseQuizTags(editingQuiz.tags));
            setTagInput('');
            setAiDetectedCategory(normalizeAiCategory(editingQuiz.detectedCategory));
            setAiDetectedLesson(
                typeof editingQuiz.detectedLesson === 'string' ? editingQuiz.detectedLesson : '',
            );
            setAiSuggestedTags(normalizeTags(editingQuiz.suggestedTags));
            setPromptProfile(DEFAULT_PROMPT_PROFILE);
            setProfilePresetNotice(null);
            return;
        }

        setTopic('');
        setQuizTitle('');
        setClassLevel(isClassLocked ? lockedClass : '3');
        setContent('');
        setManualTimeLimit('');
        setGeneratedQuiz(null);
        setRequireCode(false);
        setAccessCode('');
        setShowOnHome(true);
        setCustomPrompt('');
        setUploadedFile(null);
        setCategory('toan');
        setTags([]);
        setTagInput('');
        setAiDetectedCategory(null);
        setAiDetectedLesson('');
        setAiSuggestedTags([]);
        setPromptProfile(DEFAULT_PROMPT_PROFILE);
        setProfilePresetNotice(null);
    }, [editingQuiz, isClassLocked, lockedClass]);

    useEffect(() => {
        localStorage.setItem('quiz_image_library', JSON.stringify(imageLibrary));
    }, [imageLibrary]);

    useEffect(() => {
        localStorage.setItem('ai_provider', aiProvider);
    }, [aiProvider]);

    useGeneratedQuizSync({
        generatedQuiz,
        setGeneratedQuiz,
        manualTimeLimit,
        classLevel,
        category,
        requireCode,
        accessCode,
        showOnHome,
        quizTitle,
        teacherName,
        tags,
    });

    return {
        topic,
        setTopic,
        quizTitle,
        setQuizTitle,
        classLevel,
        setClassLevel,
        category,
        setCategory,
        tags,
        setTags,
        tagInput,
        setTagInput,
        aiDetectedCategory,
        setAiDetectedCategory,
        aiDetectedLesson,
        setAiDetectedLesson,
        aiSuggestedTags,
        setAiSuggestedTags,
        content,
        setContent,
        manualTimeLimit,
        setManualTimeLimit,
        generatedQuiz,
        setGeneratedQuiz,
        error,
        setError,
        customPrompt,
        setCustomPrompt,
        quizMode,
        setQuizMode,
        aiProvider,
        setAiProvider,
        selectedTypes,
        setSelectedTypes,
        difficultyLevels,
        setDifficultyLevels,
        promptProfile,
        profilePresetNotice,
        requireCode,
        setRequireCode,
        accessCode,
        setAccessCode,
        showOnHome,
        setShowOnHome,
        uploadedFile,
        setUploadedFile,
        fileInputRef,
        expandedSections,
        toggleSection,
        imageLibrary,
        setImageLibrary,
        assignToClass,
        setAssignToClass,
        selectedClassId,
        setSelectedClassId,
        deadline,
        setDeadline,
        maxAttempts,
        setMaxAttempts,
        tnSearchMode,
        setTnSearchMode,
        generateRandomCode,
        handleToggleThongTu27,
        handleSelectLearnerMode,
        addTagToState,
        handleApplyAiCategory,
        handleApplyAiTitleSuggestion,
        handleStartManual,
        resetAfterSave,
    };
};
