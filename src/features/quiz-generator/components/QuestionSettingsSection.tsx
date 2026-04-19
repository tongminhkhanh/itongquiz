import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import CollapsibleSection from './CollapsibleSection';
import { QuestionTypeSelector, DifficultyLevelSelector } from '../../../components/teacher/QuizCreator';

interface QuestionSettingsSectionProps {
    selectedTypes: Record<string, boolean>;
    setSelectedTypes: (v: Record<string, boolean>) => void;
    difficultyLevels: {
        level1: number;
        level2: number;
        level3: number;
    };
    setDifficultyLevels: (v: any) => void;
    isOpenTypes: boolean;
    isOpenDifficulty: boolean;
    onToggle: (id: string) => void;
}

const QuestionSettingsSection: React.FC<QuestionSettingsSectionProps> = ({
    selectedTypes, setSelectedTypes,
    difficultyLevels, setDifficultyLevels,
    isOpenTypes, isOpenDifficulty, onToggle
}) => {
    const questionCount = difficultyLevels.level1 + difficultyLevels.level2 + difficultyLevels.level3;
    const selectedTypesCount = Object.values(selectedTypes).filter(Boolean).length;

    return (
        <>
            <CollapsibleSection
                id="questionTypes"
                icon={<BookOpen className="w-4 h-4" />}
                title="Dạng câu hỏi"
                badge={`${selectedTypesCount} đã chọn`}
                isOpen={isOpenTypes}
                onToggle={onToggle}
            >
                <QuestionTypeSelector
                    selectedTypes={selectedTypes}
                    onChange={setSelectedTypes}
                />
            </CollapsibleSection>

            <CollapsibleSection
                id="difficulty"
                icon={<Sparkles className="w-4 h-4" />}
                title="Độ khó & Số lượng"
                badge={`${questionCount} câu`}
                isOpen={isOpenDifficulty}
                onToggle={onToggle}
            >
                <DifficultyLevelSelector
                    levels={difficultyLevels}
                    onChange={setDifficultyLevels}
                />
            </CollapsibleSection>
        </>
    );
};

export default QuestionSettingsSection;
