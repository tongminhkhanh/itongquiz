import React, { useEffect, useRef } from 'react';
import { Question, QuestionType } from '../../types';
import { CheckCircle, RefreshCcw } from 'lucide-react';
import GeometryRenderer, { GeometryData } from '../common/GeometryRenderer';
import { renderMathJax } from '../../hooks/useMathJax';

interface QuestionRendererProps {
    question: Question;
    index: number;
    answers: Record<string, any>;
    onAnswerChange: (questionId: string, value: any, subId?: string) => void;
    onMatchingClick: (questionId: string, item: string, type: 'left' | 'right') => void;
}

import { formatMathText } from '../../utils/formatters';

// Helper function to render HTML content (supports <u>, <b>, <i> tags from PDF)
// Also handles LaTeX math formulas with MathJax
const renderHtml = (text: string) => {
    if (!text) return null;
    const formatted = formatMathText(text);
    // Check if text contains HTML tags OR LaTeX math delimiters ($...$)
    if (/<[^>]+>/.test(formatted) || /\$[^$]+\$/.test(formatted)) {
        return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
    }
    return <>{formatted}</>;
};

/**
 * MathSpan: Component to render math content without React DOM reconciliation conflicts.
 * This component:
 * 1. Renders an empty span initially
 * 2. Sets innerHTML manually via useLayoutEffect (before paint)
 * 3. Triggers MathJax rendering
 * 4. React has no children to reconcile, so MathJax changes don't cause conflicts
 */
const MathSpan: React.FC<{ content: string; className?: string }> = React.memo(({ content, className }) => {
    const ref = useRef<HTMLSpanElement>(null);

    // Use useLayoutEffect to ensure content is set BEFORE browser paint
    React.useLayoutEffect(() => {
        if (ref.current) {
            ref.current.innerHTML = formatMathText(content);
            // Trigger MathJax after setting innerHTML
            renderMathJax(ref.current);
        }
    }, [content]);

    return <span ref={ref} className={className} />;
});


// Color palette for matching pairs
const pairColors = [
    { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700' },
    { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-700' },
    { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-700' },
    { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-700' },
    { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-700' },
    { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-700' },
    { bg: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-700' },
    { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-700' },
];

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
    question: q,
    index,
    answers,
    onAnswerChange,
    onMatchingClick,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Trigger MathJax rendering when question content changes
    useEffect(() => {
        if (containerRef.current) {
            // Delay to ensure DOM is updated AND MathJax is fully loaded
            const timeoutId = setTimeout(() => {
                renderMathJax(containerRef.current);
            }, 200);  // Increased from 50ms for slower connections
            return () => clearTimeout(timeoutId);
        }
    }, [q, answers[q.id]]); // Re-render when question or answer changes


    return (
        <div ref={containerRef} id={`question-${index}`} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 scroll-mt-24">
            {/* Question Header */}
            <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Câu hỏi {index + 1}</h3>
                <div className="text-gray-700 font-medium">
                    {q.type === QuestionType.TRUE_FALSE || q.type === QuestionType.MATCHING ? (
                        <p>{renderHtml(q.mainQuestion || "")}</p>
                    ) : (
                        <p>{renderHtml((q as any).question || "")}</p>
                    )}
                </div>

                {/* Image in header - exclude IMAGE_QUESTION since it has its own section */}
                {q.image && q.type !== QuestionType.IMAGE_QUESTION && (
                    <div className="mt-3">
                        <img
                            src={q.image}
                            alt="Question Illustration"
                            className="max-h-64 rounded-lg border border-gray-200 object-contain"
                        />
                    </div>
                )}

                {/* Geometry SVG Illustration */}
                {(q as any).geometry && (
                    <div className="mt-3 flex justify-center">
                        <GeometryRenderer
                            data={(q as any).geometry as GeometryData}
                            className="border border-gray-200 rounded-lg"
                        />
                    </div>
                )}
            </div>

            {/* Answer Section */}
            <div className="mt-4 pl-0 md:pl-4 border-l-0 md:border-l-4 border-orange-100">
                {/* MCQ */}
                {q.type === QuestionType.MCQ && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt, idx) => {
                            const label = String.fromCharCode(65 + idx);
                            const isSelected = answers[q.id] === label;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => onAnswerChange(q.id, label)}
                                    className={`text-left p-3 rounded-lg border transition-all flex items-center ${isSelected
                                        ? 'border-orange-500 bg-orange-50 text-orange-900 ring-1 ring-orange-500'
                                        : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 ${isSelected ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 text-gray-500'
                                        }`}>
                                        {label}
                                    </span>
                                    <span>{formatMathText(opt)}</span>
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Short Answer - hỗ trợ cả legacy và inline blank */}
                {q.type === QuestionType.SHORT_ANSWER && (() => {
                    const questionText = (q as any).question || "";
                    // Check if question has inline blanks: [blank], _____, [1], [2], etc.
                    const hasInlineBlanks = /\[blank\]|\[_+\]|_{3,}|\[\d+\]/.test(questionText);

                    if (hasInlineBlanks) {
                        // Mode 2: Inline blanks - render input boxes inline with text
                        const parts = questionText.split(/(\[blank\]|\[_+\]|_{3,}|\[\d+\])/g);
                        let blankIndex = 0;
                        const currentAnswers = (answers[q.id] as Record<number, string>) || {};

                        return (
                            <div className="space-y-4">
                                <div className="text-lg leading-loose font-medium text-gray-800 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    {parts.map((part, idx) => {
                                        if (/^\[blank\]$|\[_+\]$|^_{3,}$|^\[\d+\]$/.test(part)) {
                                            const currentIdx = blankIndex;
                                            blankIndex++;
                                            return (
                                                <input
                                                    key={idx}
                                                    type="text"
                                                    value={currentAnswers[currentIdx] || ''}
                                                    onChange={(e) => {
                                                        const newAnswers = { ...currentAnswers };
                                                        newAnswers[currentIdx] = e.target.value;
                                                        onAnswerChange(q.id, newAnswers);
                                                    }}
                                                    className="inline-block w-28 mx-1 px-3 py-1.5 border-2 border-gray-300 rounded-lg bg-gray-50 text-center font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                                                    placeholder="..."
                                                />
                                            );
                                        }
                                        return <span key={idx}>{formatMathText(part)}</span>;
                                    })}
                                </div>

                                {/* Show filled count */}
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">
                                        Đã điền: {Object.values(currentAnswers).filter(v => v).length}/{blankIndex}
                                    </span>
                                    <button
                                        onClick={() => onAnswerChange(q.id, {})}
                                        className="text-red-500 hover:underline flex items-center gap-1"
                                    >
                                        <RefreshCcw className="w-3 h-3" /> Xóa tất cả
                                    </button>
                                </div>
                            </div>
                        );
                    } else {
                        // Mode 1: Legacy single input
                        return (
                            <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Trả lời:</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={answers[q.id] || ''}
                                        onChange={(e) => onAnswerChange(q.id, e.target.value)}
                                        className="flex-1 p-2 border-b-2 border-gray-400 bg-transparent focus:border-orange-500 outline-none font-mono text-lg"
                                        placeholder="Nhập đáp án..."
                                    />
                                </div>
                            </div>
                        );
                    }
                })()}

                {/* True/False */}
                {q.type === QuestionType.TRUE_FALSE && (
                    <div className="space-y-2">
                        {q.items.map((item, i) => {
                            const itemKey = item.id || `item-${i}`;
                            const val = answers[q.id]?.[itemKey];
                            return (
                                <div key={itemKey} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="text-gray-700 mr-4 flex-1 text-sm">
                                        {String.fromCharCode(97 + i)}. {formatMathText(item.statement)}
                                    </span>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => onAnswerChange(q.id, true, itemKey)}
                                            className={`w-10 h-8 rounded font-bold text-sm transition-colors ${val === true ? 'bg-green-500 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-400 hover:bg-gray-100'}`}
                                        >Đ</button>
                                        <button
                                            onClick={() => onAnswerChange(q.id, false, itemKey)}
                                            className={`w-10 h-8 rounded font-bold text-sm transition-colors ${val === false ? 'bg-red-500 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-400 hover:bg-gray-100'}`}
                                        >S</button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Matching */}
                {q.type === QuestionType.MATCHING && (() => {
                    const currentAnswers = answers[q.id] || {};
                    const pairedLeftItems = Object.keys(currentAnswers).filter(key => key !== 'selectedLeft' && currentAnswers[key]);
                    const leftToColorIndex: Record<string, number> = {};
                    pairedLeftItems.forEach((left, idx) => {
                        leftToColorIndex[left] = idx % pairColors.length;
                    });

                    return (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <p className="font-bold text-blue-600 text-center">Cột A</p>
                                    {q.pairs.map((pair) => {
                                        const isSelectedLeft = currentAnswers.selectedLeft === pair.left;
                                        const isPaired = currentAnswers[pair.left] !== undefined;
                                        const colorIdx = leftToColorIndex[pair.left];
                                        const color = isPaired && colorIdx !== undefined ? pairColors[colorIdx] : null;

                                        return (
                                            <div
                                                key={pair.left}
                                                className={`p-3 rounded-lg border-2 cursor-pointer transition-all font-medium ${isSelectedLeft
                                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300'
                                                    : color
                                                        ? `${color.border} ${color.bg} ${color.text}`
                                                        : 'border-gray-200 hover:border-blue-300'
                                                    }`}
                                                onClick={() => onMatchingClick(q.id, pair.left, 'left')}
                                            >
                                                {color && <span className="mr-2">●</span>}
                                                <MathSpan content={pair.left} />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="space-y-3">
                                    <p className="font-bold text-orange-600 text-center">Cột B</p>
                                    {Array.from(new Set(q.pairs.map(p => p.right)))
                                        .sort((a, b) => (a as string).localeCompare(b as string))
                                        .map((rightItem) => {
                                            const pairedLefts = Object.keys(currentAnswers).filter(key => currentAnswers[key] === rightItem && key !== 'selectedLeft');
                                            const isPaired = pairedLefts.length > 0;
                                            const colorIdx = isPaired ? leftToColorIndex[pairedLefts[0]] : undefined;
                                            const color = colorIdx !== undefined ? pairColors[colorIdx] : null;

                                            return (
                                                <div
                                                    key={rightItem}
                                                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all font-medium ${color
                                                        ? `${color.border} ${color.bg} ${color.text}`
                                                        : 'border-gray-200 hover:border-orange-300'
                                                        }`}
                                                    onClick={() => onMatchingClick(q.id, rightItem as string, 'right')}
                                                >
                                                    {color && <span className="mr-2">●</span>}
                                                    <MathSpan content={rightItem as string} />
                                                    {pairedLefts.length > 1 && (
                                                        <span className="ml-2 text-xs bg-white/50 px-1.5 py-0.5 rounded-full border border-black/10">
                                                            x{pairedLefts.length}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            {pairedLeftItems.length > 0 && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs font-bold text-gray-600 mb-2">Đã nối:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {pairedLeftItems.map(left => {
                                            const colorIdx = leftToColorIndex[left];
                                            const color = pairColors[colorIdx];
                                            return (
                                                <span key={left} className={`text-xs px-2 py-1 rounded ${color.bg} ${color.text} ${color.border} border`}>
                                                    <MathSpan content={`${left} ↔ ${currentAnswers[left]}`} />
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="mt-3 text-sm text-gray-500 text-center">
                                Chọn một ô ở Cột A, sau đó chọn ô tương ứng ở Cột B để nối.
                            </div>
                            <button
                                onClick={() => onAnswerChange(q.id, {})}
                                className="mt-2 text-xs text-red-500 underline"
                            >
                                Làm lại câu này
                            </button>
                        </div>
                    );
                })()}

                {/* Multiple Select */}
                {q.type === QuestionType.MULTIPLE_SELECT && (
                    <div className="grid grid-cols-1 gap-2">
                        {q.options.map((opt, idx) => {
                            const label = String.fromCharCode(65 + idx);
                            const currentAnswers = (answers[q.id] as string[]) || [];
                            const isSelected = currentAnswers.includes(label);
                            return (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        const newAnswers = isSelected
                                            ? currentAnswers.filter(a => a !== label)
                                            : [...currentAnswers, label].sort();
                                        onAnswerChange(q.id, newAnswers);
                                    }}
                                    className={`text-left p-3 rounded-lg border transition-all flex items-center ${isSelected
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                                        : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300'}`}>
                                        {isSelected && <CheckCircle className="w-3 h-3" />}
                                    </div>
                                    {formatMathText(opt)}
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Drag & Drop */}
                {q.type === QuestionType.DRAG_DROP && (() => {
                    const currentAnswers = (answers[q.id] as Record<number, string>) || {};
                    const text = (q as any).text || "";
                    const parts = text.split(/(\[.*?\])/g);
                    const blanks: number[] = [];
                    parts.forEach((part: string, idx: number) => {
                        if (part.startsWith('[') && part.endsWith(']')) {
                            blanks.push(idx);
                        }
                    });

                    const qBlanks = (q as any).blanks || [];
                    const qDistractors = (q as any).distractors || [];
                    const words = [...qBlanks, ...qDistractors];
                    const seed = q.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                    const allWords = words.sort((a, b) => {
                        const hashA = (a.charCodeAt(0) * seed) % 100;
                        const hashB = (b.charCodeAt(0) * seed) % 100;
                        return hashA - hashB;
                    });

                    const handleWordClick = (word: string) => {
                        const firstEmptyBlankIdx = blanks.find(idx => !currentAnswers[idx]);
                        if (firstEmptyBlankIdx !== undefined) {
                            onAnswerChange(q.id, { ...currentAnswers, [firstEmptyBlankIdx]: word });
                        }
                    };

                    const handleBlankClick = (idx: number) => {
                        const newAnswers = { ...currentAnswers };
                        delete newAnswers[idx];
                        onAnswerChange(q.id, newAnswers);
                    };

                    return (
                        <div className="space-y-6">
                            <div className="text-lg leading-loose font-medium text-gray-800 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                {parts.map((part, idx) => {
                                    if (part.startsWith('[') && part.endsWith(']')) {
                                        const filledWord = currentAnswers[idx];
                                        return (
                                            <span
                                                key={idx}
                                                onClick={() => filledWord && handleBlankClick(idx)}
                                                className={`inline-block min-w-[80px] h-10 mx-1 px-3 py-1 align-middle text-center rounded-lg border-2 border-dashed transition-all cursor-pointer select-none flex items-center justify-center ${filledWord
                                                    ? 'bg-indigo-100 border-indigo-500 text-indigo-700 font-bold border-solid'
                                                    : 'bg-gray-50 border-gray-300 text-gray-400 hover:border-indigo-300'
                                                    }`}
                                            >
                                                {filledWord || (idx + 1)}
                                            </span>
                                        );
                                    }
                                    return <span key={idx}>{formatMathText(part)}</span>;
                                })}
                            </div>

                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <p className="text-sm font-bold text-indigo-800 mb-3 uppercase tracking-wide">Kho từ vựng (Chạm để điền):</p>
                                <div className="flex flex-wrap gap-3">
                                    {allWords.map((word, wIdx) => {
                                        const usedCount = Object.values(currentAnswers).filter(w => w === word).length;
                                        const totalCount = allWords.filter(w => w === word).length;
                                        const isFullyUsed = usedCount >= totalCount;

                                        return (
                                            <button
                                                key={`${word}-${wIdx}`}
                                                onClick={() => !isFullyUsed && handleWordClick(word)}
                                                disabled={isFullyUsed}
                                                className={`px-4 py-2 rounded-lg font-bold shadow-sm transition-all transform active:scale-95 ${isFullyUsed
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                                    : 'bg-white text-indigo-700 hover:bg-indigo-600 hover:text-white hover:shadow-md border border-indigo-200'
                                                    }`}
                                            >
                                                {word}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => onAnswerChange(q.id, {})}
                                    className="text-xs text-red-500 hover:underline flex items-center"
                                >
                                    <RefreshCcw className="w-3 h-3 mr-1" /> Làm lại câu này
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* Ordering - Sắp xếp thứ tự câu */}
                {q.type === QuestionType.ORDERING && (() => {
                    const currentAnswers = (answers[q.id] as Record<number, number>) || {};
                    const items = (q as any).items || [];

                    const handleOrderChange = (itemIndex: number, orderValue: string) => {
                        const num = parseInt(orderValue, 10);
                        if (orderValue === '' || (!isNaN(num) && num >= 1 && num <= items.length)) {
                            onAnswerChange(q.id, {
                                ...currentAnswers,
                                [itemIndex]: orderValue === '' ? undefined : num
                            });
                        }
                    };

                    return (
                        <div className="space-y-4">
                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mb-4">
                                <p className="text-sm text-amber-800">
                                    📝 <strong>Hướng dẫn:</strong> Điền số thứ tự (1, 2, 3...) vào ô trống để sắp xếp các câu thành đoạn văn hoàn chỉnh.
                                </p>
                            </div>

                            <div className="space-y-3">
                                {items.map((item: string, idx: number) => (
                                    <div key={idx} className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <div className="flex-shrink-0">
                                            <input
                                                type="number"
                                                min="1"
                                                max={items.length}
                                                value={currentAnswers[idx] || ''}
                                                onChange={(e) => handleOrderChange(idx, e.target.value)}
                                                placeholder="?"
                                                className="w-12 h-12 text-center text-xl font-bold border-2 border-amber-400 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                                            />
                                        </div>
                                        <div className="flex-1 pt-2">
                                            <p className="text-gray-800">{renderHtml(item)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center mt-4">
                                <p className="text-xs text-gray-500">
                                    Đã điền: {Object.values(currentAnswers).filter(v => v !== undefined).length}/{items.length}
                                </p>
                                <button
                                    onClick={() => onAnswerChange(q.id, {})}
                                    className="text-xs text-red-500 hover:underline flex items-center"
                                >
                                    <RefreshCcw className="w-3 h-3 mr-1" /> Làm lại câu này
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* Image Question - MCQ với hình bắt buộc */}
                {q.type === QuestionType.IMAGE_QUESTION && (
                    <div className="space-y-4">
                        {/* Hình ảnh - hiển thị nổi bật */}
                        {(q as any).image && (
                            <div className="flex justify-center">
                                <img
                                    src={(q as any).image}
                                    alt="Question illustration"
                                    className="max-h-72 rounded-xl border-2 border-gray-200 shadow-md object-contain"
                                />
                            </div>
                        )}
                        {/* Options giống MCQ */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {((q as any).options || []).map((opt: string, idx: number) => {
                                const label = String.fromCharCode(65 + idx);
                                const isSelected = answers[q.id] === label;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => onAnswerChange(q.id, label)}
                                        className={`text-left p-3 rounded-lg border transition-all flex items-center ${isSelected
                                            ? 'border-orange-500 bg-orange-50 text-orange-900 ring-1 ring-orange-500'
                                            : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 ${isSelected ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300 text-gray-500'
                                            }`}>
                                            {label}
                                        </span>
                                        <span>{formatMathText(opt)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Dropdown Question - Điền vào chỗ trống bằng dropdown */}
                {q.type === QuestionType.DROPDOWN && (() => {
                    const currentAnswers = (answers[q.id] as Record<string, string>) || {};
                    const blanks = (q as any).blanks || [];
                    const text = (q as any).text || "";
                    // Parse text: "Thủ đô là [1] có dân số [2] triệu"
                    const parts = text.split(/(\[\d+\])/g);

                    return (
                        <div className="space-y-4">
                            <div className="text-lg leading-loose font-medium text-gray-800 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                {parts.map((part: string, idx: number) => {
                                    const match = part.match(/\[(\d+)\]/);
                                    if (match) {
                                        const blankIndex = parseInt(match[1]) - 1;
                                        const blank = blanks[blankIndex];
                                        if (blank) {
                                            return (
                                                <select
                                                    key={idx}
                                                    value={currentAnswers[blank.id] || ''}
                                                    onChange={(e) => onAnswerChange(q.id, e.target.value, blank.id)}
                                                    className={`mx-1 px-3 py-1.5 border-2 rounded-lg font-medium transition-all cursor-pointer ${currentAnswers[blank.id]
                                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                        : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-indigo-300'
                                                        }`}
                                                >
                                                    <option value="">-- Chọn --</option>
                                                    {(blank.options || []).map((opt: string, i: number) => (
                                                        <option key={i} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            );
                                        }
                                    }
                                    return <span key={idx}>{formatMathText(part)}</span>;
                                })}
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-gray-500">
                                    Đã điền: {Object.keys(currentAnswers).length}/{blanks.length}
                                </p>
                                <button
                                    onClick={() => onAnswerChange(q.id, {})}
                                    className="text-xs text-red-500 hover:underline flex items-center"
                                >
                                    <RefreshCcw className="w-3 h-3 mr-1" /> Làm lại câu này
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* Underline Question - Gạch chân từ trong câu */}
                {q.type === QuestionType.UNDERLINE && (() => {
                    const selectedIndexes = (answers[q.id] as number[]) || [];
                    const words = (q as any).words || [];

                    const toggleWord = (index: number) => {
                        if (selectedIndexes.includes(index)) {
                            onAnswerChange(q.id, selectedIndexes.filter(i => i !== index));
                        } else {
                            onAnswerChange(q.id, [...selectedIndexes, index].sort((a, b) => a - b));
                        }
                    };

                    return (
                        <div className="space-y-4">
                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mb-4">
                                <p className="text-sm text-amber-800">
                                    📝 <strong>Hướng dẫn:</strong> Nhấn vào từ để gạch chân. Nhấn lại để bỏ gạch chân.
                                </p>
                            </div>

                            {/* Sentence with clickable words */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <p className="text-lg leading-loose text-gray-800 text-center">
                                    {words.map((word: string, idx: number) => {
                                        const isSelected = selectedIndexes.includes(idx);
                                        return (
                                            <span key={idx}>
                                                <button
                                                    onClick={() => toggleWord(idx)}
                                                    className={`mx-1 px-2 py-1 rounded transition-all font-medium ${isSelected
                                                        ? 'bg-yellow-100 border-b-4 border-yellow-500 text-yellow-800'
                                                        : 'hover:bg-gray-100 text-gray-700'
                                                        }`}
                                                    style={isSelected ? { textDecoration: 'underline', textDecorationThickness: '3px' } : {}}
                                                >
                                                    {formatMathText(word)}
                                                </button>
                                                {idx < words.length - 1 && ' '}
                                            </span>
                                        );
                                    })}
                                </p>
                            </div>

                            {/* Selected words display */}
                            {selectedIndexes.length > 0 && (
                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                    <p className="text-sm text-yellow-800">
                                        <strong>Đã gạch chân:</strong>{' '}
                                        {selectedIndexes.map(i => words[i]).join(', ')}
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-between items-center">
                                <p className="text-xs text-gray-500">
                                    Đã chọn: {selectedIndexes.length} từ
                                </p>
                                <button
                                    onClick={() => onAnswerChange(q.id, [])}
                                    className="text-xs text-red-500 hover:underline flex items-center"
                                >
                                    <RefreshCcw className="w-3 h-3 mr-1" /> Làm lại câu này
                                </button>
                            </div>
                        </div>
                    );
                })()}

                {/* Categorization - Kéo thả phân loại vào nhóm */}
                {q.type === QuestionType.CATEGORIZATION && (() => {
                    const categories = (q as any).categories || [];
                    const items = (q as any).items || [];
                    const instruction = (q as any).instruction || '';
                    const currentAnswers = (answers[q.id] as Record<string, string>) || {};
                    const selectedItem = currentAnswers._selected || null;

                    // Items chưa được phân loại
                    const unplacedItems = items.filter((item: any) => !currentAnswers[item.id]);

                    // Lấy items đã phân loại vào category
                    const getItemsInCategory = (catId: string) => {
                        return items.filter((item: any) => currentAnswers[item.id] === catId);
                    };

                    const handleItemClick = (itemId: string) => {
                        if (currentAnswers[itemId]) {
                            // Item đã được phân loại → trả về vùng chưa phân loại
                            const newAnswers = { ...currentAnswers };
                            delete newAnswers[itemId];
                            onAnswerChange(q.id, newAnswers);
                        } else if (selectedItem === itemId) {
                            // Bỏ chọn item
                            const newAnswers = { ...currentAnswers };
                            delete newAnswers._selected;
                            onAnswerChange(q.id, newAnswers);
                        } else {
                            // Chọn item
                            onAnswerChange(q.id, { ...currentAnswers, _selected: itemId });
                        }
                    };

                    const handleCategoryClick = (catId: string) => {
                        if (selectedItem && !currentAnswers[selectedItem]) {
                            // Di chuyển item vào category
                            const newAnswers = { ...currentAnswers, [selectedItem]: catId };
                            delete newAnswers._selected;
                            onAnswerChange(q.id, newAnswers);
                        }
                    };

                    // Màu sắc cho các items
                    const categoryColors = [
                        { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700', hover: 'hover:bg-blue-200' },
                        { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700', hover: 'hover:bg-green-200' },
                        { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700', hover: 'hover:bg-purple-200' },
                        { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-700', hover: 'hover:bg-orange-200' },
                        { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-700', hover: 'hover:bg-pink-200' },
                    ];

                    const getCategoryColor = (catIndex: number) => categoryColors[catIndex % categoryColors.length];

                    return (
                        <div className="space-y-4">
                            {/* Instruction */}
                            {instruction && (
                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                                    <p className="text-sm text-amber-800">
                                        📝 <em>{instruction}</em>
                                    </p>
                                </div>
                            )}

                            {/* Items chưa phân loại */}
                            <div className="bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-300">
                                <p className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">
                                    Các mục cần phân loại (Chạm để chọn):
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {unplacedItems.length === 0 ? (
                                        <p className="text-gray-400 text-sm italic">Đã phân loại hết!</p>
                                    ) : (
                                        unplacedItems.map((item: any) => {
                                            const isSelected = selectedItem === item.id;
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => handleItemClick(item.id)}
                                                    className={`px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-all transform active:scale-95 ${isSelected
                                                        ? 'bg-indigo-500 text-white ring-2 ring-indigo-300 ring-offset-2 scale-105'
                                                        : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                                                        }`}
                                                >
                                                    {item.content}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                                {selectedItem && (
                                    <p className="text-xs text-indigo-600 mt-3 font-medium">
                                        👆 Đã chọn! Giờ hãy chạm vào nhóm bên dưới để xếp vào.
                                    </p>
                                )}
                            </div>

                            {/* Categories */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {categories.map((cat: any, catIdx: number) => {
                                    const color = getCategoryColor(catIdx);
                                    const itemsInCat = getItemsInCategory(cat.id);
                                    const isHighlighted = selectedItem && !currentAnswers[selectedItem];

                                    return (
                                        <div
                                            key={cat.id}
                                            onClick={() => handleCategoryClick(cat.id)}
                                            className={`p-4 rounded-xl border-2 min-h-[120px] transition-all ${isHighlighted
                                                ? `${color.border} ${color.bg} cursor-pointer ring-2 ring-offset-1 ring-indigo-300`
                                                : `border-gray-200 bg-white`
                                                }`}
                                        >
                                            <p className={`font-bold text-sm mb-3 ${color.text}`}>
                                                {cat.name}
                                            </p>
                                            <div className="flex flex-wrap gap-2 min-h-[40px]">
                                                {itemsInCat.length === 0 ? (
                                                    <p className="text-gray-300 text-xs italic">
                                                        {isHighlighted ? 'Chạm vào đây để thả...' : 'Chưa có mục nào'}
                                                    </p>
                                                ) : (
                                                    itemsInCat.map((item: any) => (
                                                        <button
                                                            key={item.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleItemClick(item.id);
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${color.bg} ${color.text} ${color.border} border transition-all hover:opacity-80`}
                                                            title="Chạm để bỏ ra"
                                                        >
                                                            {item.content}
                                                            <span className="ml-1 opacity-60">×</span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Status and Reset */}
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-gray-500">
                                    Đã phân loại: {Object.keys(currentAnswers).filter(k => k !== '_selected').length}/{items.length}
                                </p>
                                <button
                                    onClick={() => onAnswerChange(q.id, {})}
                                    className="text-xs text-red-500 hover:underline flex items-center"
                                >
                                    <RefreshCcw className="w-3 h-3 mr-1" /> Làm lại câu này
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* WORD_SCRAMBLE - Sắp xếp chữ cái thành từ */}
            <div className="mt-4">
                {q.type === QuestionType.WORD_SCRAMBLE && (() => {
                    const letters = (q as any).letters || [];
                    const correctWord = (q as any).correctWord || '';
                    const hint = (q as any).hint || '';
                    const currentAnswer = answers[q.id] || [];

                    // Letters that haven't been selected yet
                    const availableLetters = letters.map((letter: string, idx: number) => ({
                        letter,
                        originalIndex: idx,
                        isUsed: currentAnswer.includes(idx)
                    }));

                    const handleLetterClick = (originalIndex: number) => {
                        if (currentAnswer.includes(originalIndex)) {
                            // Remove from selection
                            onAnswerChange(q.id, currentAnswer.filter((i: number) => i !== originalIndex));
                        } else {
                            // Add to selection
                            onAnswerChange(q.id, [...currentAnswer, originalIndex]);
                        }
                    };

                    const getCurrentWord = () => {
                        return currentAnswer.map((idx: number) => letters[idx]).join('');
                    };

                    return (
                        <div className="space-y-4">
                            {/* Hint */}
                            {hint && (
                                <p className="text-sm text-gray-500 italic">💡 Gợi ý: {hint}</p>
                            )}

                            {/* Current word being built */}
                            <div className="bg-green-50 p-4 rounded-lg border-2 border-dashed border-green-300 min-h-[60px]">
                                <p className="text-xs text-green-600 mb-2">Từ của bạn:</p>
                                <div className="flex flex-wrap gap-1">
                                    {currentAnswer.length === 0 ? (
                                        <span className="text-gray-400 italic">Chọn các chữ cái bên dưới...</span>
                                    ) : (
                                        currentAnswer.map((idx: number, i: number) => (
                                            <button
                                                key={`selected-${i}`}
                                                onClick={() => handleLetterClick(idx)}
                                                className="w-10 h-10 bg-green-500 text-white rounded-lg font-bold text-lg hover:bg-green-600 transition-colors shadow"
                                            >
                                                {letters[idx]}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Available letters */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-xs text-gray-600 mb-2">Chọn chữ cái:</p>
                                <div className="flex flex-wrap gap-2">
                                    {availableLetters.map((item: any, i: number) => (
                                        <button
                                            key={`letter-${i}`}
                                            onClick={() => handleLetterClick(item.originalIndex)}
                                            disabled={item.isUsed}
                                            className={`w-10 h-10 rounded-lg font-bold text-lg transition-all shadow ${item.isUsed
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                                                : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105'
                                                }`}
                                        >
                                            {item.letter}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Status and Reset */}
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-gray-500">
                                    Đã chọn: {currentAnswer.length}/{letters.length} chữ
                                </p>
                                <button
                                    onClick={() => onAnswerChange(q.id, [])}
                                    className="text-xs text-red-500 hover:underline flex items-center"
                                >
                                    <RefreshCcw className="w-3 h-3 mr-1" /> Làm lại câu này
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* RIDDLE - Giải câu đố */}
            <div className="mt-4">
                {q.type === QuestionType.RIDDLE && (() => {
                    const riddleLines = (q as any).riddleLines || [];
                    const hint = (q as any).hint || '';
                    const answerLabel = (q as any).answerLabel || 'Đáp án';
                    const currentAnswer = answers[q.id] || '';

                    return (
                        <div className="space-y-4">
                            {/* Riddle Text */}
                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                <div className="text-lg text-amber-900 leading-relaxed">
                                    {riddleLines.map((line: string, i: number) => (
                                        <p key={i} className="mb-1 italic">
                                            {line}
                                        </p>
                                    ))}
                                </div>
                            </div>

                            {/* Hint */}
                            {hint && (
                                <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                                    💡 <strong>Gợi ý:</strong> {hint}
                                </p>
                            )}

                            {/* Single Answer Input */}
                            <div className="flex items-center gap-3 bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                                <span className="text-indigo-700 font-medium whitespace-nowrap">{answerLabel}:</span>
                                <input
                                    type="text"
                                    value={currentAnswer}
                                    onChange={(e) => onAnswerChange(q.id, e.target.value)}
                                    placeholder="Nhập đáp án (1 tiếng)..."
                                    className="flex-1 px-4 py-2 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-bold text-center bg-white"
                                />
                            </div>

                            {/* Reset */}
                            <div className="flex justify-end">
                                <button
                                    onClick={() => onAnswerChange(q.id, '')}
                                    className="text-xs text-red-500 hover:underline flex items-center"
                                >
                                    <RefreshCcw className="w-3 h-3 mr-1" /> Xóa đáp án
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default QuestionRenderer;

