import React, { useEffect, useRef } from 'react';
import { Question, QuestionType } from '../../types';
import { CheckCircle, RefreshCcw } from 'lucide-react';
import { renderMath } from '../../utils/mathJax';
import GeometryRenderer, { GeometryData } from '../common/GeometryRenderer';

interface QuestionRendererProps {
    question: Question;
    index: number;
    answers: Record<string, any>;
    onAnswerChange: (questionId: string, value: any, subId?: string) => void;
    onMatchingClick: (questionId: string, item: string, type: 'left' | 'right') => void;
}

// Helper function to format math text and fix common LaTeX errors
const formatText = (text: string) => {
    if (!text) return "";

    let result = text;

    // Fix common LaTeX rendering errors (backslash gets stripped)
    // These patterns catch cases where \times becomes "times", \div becomes "div", etc.

    // Fix "imes" (from \times with backslash-t becoming tab or stripped)
    result = result.replace(/(\d+)\s*imes\s*(\d+)/gi, '$1 × $2');
    result = result.replace(/imes/gi, '×');

    // Fix "times" standalone 
    result = result.replace(/(\d+)\s*times\s*(\d+)/gi, '$1 × $2');

    // Fix "div" (from \div)
    result = result.replace(/(\d+)\s*div\s*(\d+)/gi, '$1 ÷ $2');

    // Fix "cdot" (from \cdot)
    result = result.replace(/(\d+)\s*cdot\s*(\d+)/gi, '$1 · $2');

    // Fix "pm" (from \pm - plus minus)
    result = result.replace(/pm/g, '±');

    // Fix "leq" and "geq" (from \leq, \geq)
    result = result.replace(/leq/g, '≤');
    result = result.replace(/geq/g, '≥');

    // Fix "neq" (from \neq - not equal)
    result = result.replace(/neq/g, '≠');

    // Fix "sqrt" (from \sqrt) - basic case
    result = result.replace(/sqrt\{([^}]+)\}/g, '√($1)');
    result = result.replace(/sqrt(\d+)/g, '√$1');

    // Fix "frac" (from \frac) - convert to readable format
    result = result.replace(/frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');

    // Clean up orphaned $ signs that didn't get processed by MathJax
    // Only if they appear at the start/end or around simple expressions
    result = result.replace(/^\$\s*/, '');
    result = result.replace(/\s*\$$/, '');
    result = result.replace(/\$([^$]+)\$/g, '$1');

    // Standard formatting
    result = result
        .replace(/([a-zA-Z0-9?]+)\s*\*\s*([a-zA-Z0-9?]+)/g, '$1 × $2')
        .replace(/([a-zA-Z0-9?]+)\s+\/\s+([a-zA-Z0-9?]+)/g, '$1 : $2');

    return result;
};


// Helper function to render HTML content (supports <u>, <b>, <i> tags from PDF)
const renderHtml = (text: string) => {
    if (!text) return null;
    const formatted = formatText(text);
    // Check if text contains HTML tags
    if (/<[^>]+>/.test(formatted)) {
        return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
    }
    return <>{formatted}</>;
};

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
            renderMath([containerRef.current]);
        }
    }, [q, answers]);

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

                {q.image && (
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
                                    <span>{formatText(opt)}</span>
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Short Answer */}
                {q.type === QuestionType.SHORT_ANSWER && (
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
                )}

                {/* True/False */}
                {q.type === QuestionType.TRUE_FALSE && (
                    <div className="space-y-2">
                        {q.items.map((item, i) => {
                            const itemKey = item.id || `item-${i}`;
                            const val = answers[q.id]?.[itemKey];
                            return (
                                <div key={itemKey} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="text-gray-700 mr-4 flex-1 text-sm">
                                        {String.fromCharCode(97 + i)}. {formatText(item.statement)}
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
                                                {formatText(pair.left)}
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
                                                    {formatText(rightItem as string)}
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
                                                    {formatText(left)} ↔ {formatText(currentAnswers[left])}
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
                                    {formatText(opt)}
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
                                    return <span key={idx}>{formatText(part)}</span>;
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
                                        <span>{formatText(opt)}</span>
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
                                    return <span key={idx}>{formatText(part)}</span>;
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
                                                    {formatText(word)}
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
            </div>
        </div>
    );
};

export default QuestionRenderer;
