import React, { useCallback, useMemo } from 'react';
import { BaseRendererProps } from '../types';
import SmartText from '../utils/SmartText';
import LatexDropdown from '../atoms/LatexDropdown';
import InteractiveMathText, { getInteractiveBlankIds } from '../atoms/InteractiveMathText';

const seededShuffle = <T,>(values: T[], seedText: string): T[] => {
    const output = [...values];
    let seed = 2166136261;
    for (const char of seedText) {
        seed ^= char.charCodeAt(0);
        seed = Math.imul(seed, 16777619);
    }
    const random = () => {
        seed += 0x6D2B79F5;
        let value = seed;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = output.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [output[i], output[j]] = [output[j], output[i]];
    }
    return output;
};

/** Fill/dropdown renderer that keeps interactive blanks outside invalid TeX fragments. */
const FillInTheBlankRenderer: React.FC<BaseRendererProps> = ({
    question: q,
    answers,
    onAnswerChange,
}) => {
    const isDragDrop = q.type === 'DRAG_DROP' || (q as any).mathType === 'drag_drop';
    const text = String((q as any).text || (q as any).content || '');
    const blanksData = (q as any).blanks;
    const distractors = Array.isArray((q as any).distractors) ? (q as any).distractors : [];
    const blankIds = useMemo(() => getInteractiveBlankIds(text), [text]);

    const pool = useMemo(() => {
        if (!isDragDrop) return [];
        const blanks = Array.isArray(blanksData)
            ? blanksData.filter((blank: unknown) => typeof blank === 'string')
            : [];
        return seededShuffle(
            [...blanks, ...distractors].map((value) => String(value)),
            `${q.id}:${JSON.stringify(blanks)}:${JSON.stringify(distractors)}`,
        );
    }, [q.id, isDragDrop, blanksData, distractors]);

    const handleFill = useCallback((blankId: string, value: string) => {
        onAnswerChange(q.id, value, blankId);
    }, [onAnswerChange, q.id]);

    const resolveBlankOptions = useCallback((blankId: string): string[] => {
        let options: unknown[] = [];
        if (Array.isArray(blanksData)) {
            const numericId = Number.parseInt(blankId, 10);
            const found = blanksData.find((blank: any) => blank && typeof blank === 'object' && (
                String(blank.id) === blankId || blank.index === numericId
            ));
            if (found) {
                options = Array.isArray(found.options) ? found.options : [];
            } else if (Number.isFinite(numericId)) {
                const byOneBasedIndex = blanksData[numericId - 1];
                const byZeroBasedIndex = blanksData[numericId];
                const candidate = byOneBasedIndex && typeof byOneBasedIndex === 'object'
                    ? byOneBasedIndex
                    : byZeroBasedIndex;
                options = Array.isArray(candidate?.options) ? candidate.options : [];
            }
        } else if (blanksData && typeof blanksData === 'object') {
            const candidate = blanksData[blankId];
            options = Array.isArray(candidate?.options) ? candidate.options : [];
        }

        if (options.length === 0 && (q as any).options) {
            const fallback = (q as any).options[blankId];
            options = Array.isArray(fallback) ? fallback : [];
        }
        return options.map((value) => String(value));
    }, [blanksData, q]);

    const renderBlank = useCallback((blankId: string, key: React.Key): React.ReactNode => {
        const blankOptions = resolveBlankOptions(blankId);
        const currentValue = String(answers[q.id]?.[blankId] ?? '');

        if (blankOptions.length > 0) {
            return (
                <LatexDropdown
                    key={key}
                    options={blankOptions}
                    value={currentValue}
                    onChange={(value) => handleFill(blankId, value)}
                    placeholder="..."
                    className="mx-1 align-middle"
                />
            );
        }

        return (
            <input
                key={key}
                aria-label={`Ô trống ${blankId}`}
                type="text"
                value={currentValue}
                onChange={(event) => handleFill(blankId, event.target.value)}
                placeholder="..."
                className={`inline-block align-middle mx-1 px-2 py-0.5 border-b-2 outline-none min-w-[72px] w-20 text-center transition-all rounded-t-lg ${
                    isDragDrop
                        ? 'border-indigo-400 bg-indigo-50/50 cursor-pointer focus:bg-indigo-100'
                        : 'border-orange-300 bg-orange-50/30 focus:border-orange-500'
                }`}
                onClick={() => isDragDrop && currentValue && handleFill(blankId, '')}
                readOnly={isDragDrop}
            />
        );
    }, [answers, handleFill, isDragDrop, q.id, resolveBlankOptions]);

    return (
        <div className="space-y-6">
            <div className="bg-white p-5 md:p-8 rounded-2xl border-2 border-gray-100 shadow-sm leading-relaxed text-[18px] md:text-xl font-medium text-gray-800">
                <InteractiveMathText
                    content={text}
                    renderBlank={renderBlank}
                    className="quiz-interactive-math-text"
                />
            </div>

            {isDragDrop && pool.length > 0 && (
                <div className="bg-gray-50 p-5 rounded-2xl border-2 border-dashed border-gray-200">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                        📥 Chọn từ để điền vào chỗ trống:
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {pool.map((option, index) => {
                            const currentAnswers = Object.values(answers[q.id] || {}).map(String);
                            const usedCount = currentAnswers.filter((value) => value === option).length;
                            const occurrence = pool.slice(0, index + 1).filter((value) => value === option).length;
                            const isUsed = usedCount >= occurrence;

                            return (
                                <button
                                    key={`${option}-${index}`}
                                    type="button"
                                    onClick={() => {
                                        const firstEmptyId = blankIds.find((id) => !answers[q.id]?.[id]);
                                        if (firstEmptyId !== undefined) handleFill(firstEmptyId, option);
                                    }}
                                    disabled={isUsed}
                                    className={`px-4 py-2 rounded-xl border-2 font-medium transition-all shadow-sm ${
                                        isUsed
                                            ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed scale-95'
                                            : 'bg-white border-indigo-200 text-indigo-700 hover:border-indigo-500 hover:shadow-md active:scale-95'
                                    }`}
                                >
                                    <SmartText content={option} />
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() => onAnswerChange(q.id, {})}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                            Xóa hết đáp án đã chọn
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(FillInTheBlankRenderer);