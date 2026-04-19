import React, { useMemo } from 'react';
import { BaseRendererProps } from '../types';
import SmartText from '../utils/SmartText';
import LatexDropdown from '../atoms/LatexDropdown';

/**
 * FillInTheBlankRenderer: Renders text with embedded inputs, dropdownS, or drag-drop blanks.
 * Supports [1], [blue], [word] formats.
 */
const FillInTheBlankRenderer: React.FC<BaseRendererProps> = ({
    question: q,
    answers,
    onAnswerChange,
}) => {
    const isDragDrop = q.type === 'DRAG_DROP' || (q as any).mathType === 'drag_drop';
    const text = (q as any).text || (q as any).content || '';
    
    // Regex that catches [anything] inside brackets
    const bracketPattern = /(\[.+?\])/g;
    const parts = text.split(bracketPattern);
    
    // For indexing when placeholders don't have IDs (like [blank])
    let blankCounter = 0;

    // Pool of options for Drag & Drop
    const pool = useMemo(() => {
        if (!isDragDrop) return [];
        const blanks = (q as any).blanks || [];
        const distractors = (q as any).distractors || [];
        // Combine and shuffle
        return [...blanks, ...distractors].sort(() => Math.random() - 0.5);
    }, [q, isDragDrop]);

    const handleFill = (blankId: string, value: string) => {
        onAnswerChange(q.id, value, blankId);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-5 md:p-8 rounded-2xl border-2 border-gray-100 shadow-sm leading-relaxed text-[18px] md:text-xl font-medium text-gray-800">
                {parts.map((part, i) => {
                    const match = part.match(/\[(.+?)\]/);
                    if (match) {
                        const rawId = match[1];
                        // Detect stable ID (digits) or use sequence index for [blank], [...], etc.
                        const isStableId = rawId && /^\d+$/.test(rawId);
                        const blankId = isStableId ? rawId : String(blankCounter++);
                        
                        const blanksData = (q as any).blanks;
                        let blankOptions: string[] = [];
                        
                        if (Array.isArray(blanksData)) {
                            // Cố gắng tìm theo ID (chuỗi hoặc số)
                            const found = blanksData.find((b: any) => 
                                String(b.id) === String(blankId) || b.index === parseInt(blankId)
                            );
                            
                            if (found) {
                                blankOptions = found.options || [];
                            } else {
                                // Fallback: Thử lấy theo chỉ số mảng (0-based)
                                const idx = parseInt(blankId) - 1; // [1] thường là index 0
                                if (blanksData[idx]) {
                                    blankOptions = blanksData[idx].options || [];
                                } else if (blanksData[parseInt(blankId)]) {
                                    blankOptions = blanksData[parseInt(blankId)].options || [];
                                }
                            }
                        } else if (blanksData && typeof blanksData === 'object') {
                            blankOptions = blanksData[blankId]?.options || [];
                        }

                        // Debug FALLBACK: Nếu vẫn rỗng, thử tìm trong q.options nếu có
                        if (blankOptions.length === 0 && (q as any).options) {
                            blankOptions = (q as any).options[blankId] || [];
                        }
                        const currentValue = answers[q.id]?.[blankId] || '';

                        if (blankOptions.length > 0) {
                            return (
                                <LatexDropdown
                                    key={i}
                                    options={blankOptions}
                                    value={currentValue}
                                    onChange={(val) => handleFill(blankId, val)}
                                    placeholder="..."
                                    className="mx-1"
                                />
                            );
                        } else {
                            return (
                                <input
                                    key={i}
                                    type="text"
                                    value={currentValue}
                                    onChange={(e) => handleFill(blankId, e.target.value)}
                                    placeholder="..."
                                    className={`mx-1 px-4 py-0.5 border-b-2 outline-none min-w-[100px] w-auto text-center transition-all rounded-t-lg ${
                                        isDragDrop 
                                            ? 'border-indigo-400 bg-indigo-50/50 cursor-pointer focus:bg-indigo-100' 
                                            : 'border-orange-300 bg-orange-50/30 focus:border-orange-500'
                                    }`}
                                    onClick={() => isDragDrop && currentValue && handleFill(blankId, '')}
                                    readOnly={isDragDrop}
                                />
                            );
                        }
                    }
                    return <SmartText key={i} content={part} />;
                })}
            </div>

            {/* Drag/Click Options Pool */}
            {isDragDrop && pool.length > 0 && (
                <div className="bg-gray-50 p-5 rounded-2xl border-2 border-dashed border-gray-200">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                        📥 Chọn từ để điền vào chỗ trống:
                    </p>
                    <div className="flex flex-wrap gap-3">
                        {pool.map((opt, idx) => {
                            const currentAnswers = Object.values(answers[q.id] || {});
                            const usedCount = currentAnswers.filter(v => v === opt).length;
                            const occurrencesInPoolBefore = pool.slice(0, idx + 1).filter(v => v === opt).length;
                            const isUsed = usedCount >= occurrencesInPoolBefore;
                            
                            return (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        // Match the same ID logic as in the render loop
                                        const matches = text.match(/\[.+?\]/g) || [];
                                        const blankIds: string[] = [];
                                        let localCounter = 0;
                                        
                                        matches.forEach((m) => {
                                            const inner = m.slice(1, -1);
                                            const isStableId = inner && /^\d+$/.test(inner);
                                            blankIds.push(isStableId ? inner : String(localCounter++));
                                        });
                                        
                                        const firstEmptyId = blankIds.find(id => !answers[q.id]?.[id]);
                                        if (firstEmptyId !== undefined) {
                                            handleFill(firstEmptyId, opt);
                                        }
                                    }}
                                    disabled={isUsed}
                                    className={`px-4 py-2 rounded-xl border-2 font-medium transition-all shadow-sm ${
                                        isUsed
                                            ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed scale-95'
                                            : 'bg-white border-indigo-200 text-indigo-700 hover:border-indigo-500 hover:shadow-md active:scale-95'
                                    }`}
                                >
                                    <SmartText content={opt} />
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="mt-4 text-center">
                        <button 
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
