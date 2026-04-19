import React, { useMemo } from 'react';
import { BaseRendererProps } from '../types';
import MathSpan from '../atoms/MathSpan';

const pairColors = [
    { bg: 'bg-indigo-100', dot: 'bg-indigo-500', text: 'text-indigo-900', border: 'border-indigo-400' },
    { bg: 'bg-emerald-100', dot: 'bg-emerald-500', text: 'text-emerald-900', border: 'border-emerald-400' },
    { bg: 'bg-amber-100', dot: 'bg-amber-500', text: 'text-amber-900', border: 'border-amber-400' },
    { bg: 'bg-rose-100', dot: 'bg-rose-500', text: 'text-rose-900', border: 'border-rose-400' },
    { bg: 'bg-sky-100', dot: 'bg-sky-500', text: 'text-sky-900', border: 'border-sky-400' },
    { bg: 'bg-purple-100', dot: 'bg-purple-500', text: 'text-purple-900', border: 'border-purple-400' },
    { bg: 'bg-orange-100', dot: 'bg-orange-500', text: 'text-orange-900', border: 'border-orange-400' },
];

/**
 * MatchingRenderer: Renders a matching (col A vs col B) question with color-coded pairing.
 */
const MatchingRenderer: React.FC<BaseRendererProps> = ({
    question: q,
    answers,
    onAnswerChange,
    onMatchingClick,
}) => {
    const currentAnswers = (answers[q.id] as Record<string, any>) || {};
    const selectedLeft = currentAnswers.selectedLeft;
    // Helper to get only the matched pairs (filtering out internal state like selectedLeft)
    const currentPairs = useMemo(() => {
        const pairs: Record<string, string> = {};
        Object.entries(currentAnswers).forEach(([key, val]) => {
            if (key !== 'selectedLeft' && typeof val === 'string') {
                pairs[key] = val;
            }
        });
        return pairs;
    }, [currentAnswers]);
    
    // Advanced Data Detection
    let rawPairs = (q as any).pairs || [];
    let rawLeftItems = (q as any).leftItems || [];
    let rawRightItems = (q as any).rightItems || [];

    // Fallback cho QuestionSnapshot hoặc các cấu trúc khác
    if (rawLeftItems.length === 0 && rawPairs.length === 0 && Array.isArray((q as any).items)) {
        const totalItems = (q as any).items;
        if (totalItems.length > 0 && totalItems[0].left) {
            rawPairs = totalItems;
        } else {
            const half = Math.ceil(totalItems.length / 2);
            rawLeftItems = totalItems.slice(0, half).map((text: any, idx: number) => 
                typeof text === 'string' ? { id: `l-${idx}`, content: text } : text
            );
            rawRightItems = totalItems.slice(half).map((text: any, idx: number) => 
                typeof text === 'string' ? { id: `r-${idx}`, content: text } : text
            );
        }
    }
    
    // Normalize Items A
    const itemsLeft = React.useMemo(() => {
        if (rawLeftItems.length > 0) return rawLeftItems;
        if (rawPairs.length > 0) return rawPairs.map((p: any, i: number) => ({ id: `l-${i}`, content: p.left }));
        return [];
    }, [rawLeftItems, rawPairs]);

    // Stable SHUFFLE logic using session state
    // We store the shuffled IDs in the answer state so they don't change when switching questions
    const itemsRight = React.useMemo(() => {
        const rawItems = rawRightItems.length > 0 
            ? [...rawRightItems] 
            : rawPairs.map((p: any, i: number) => ({ id: `r-${i}`, content: p.right }));

        const savedOrder = currentAnswers.__shuffledIds;
        
        if (savedOrder && Array.isArray(savedOrder)) {
            // Restore from saved order
            return savedOrder
                .map(id => rawItems.find(item => item.id === id))
                .filter(Boolean);
        }

        // Fallback or Initial Shuffle (will be saved by useEffect)
        const shuffled = [...rawItems];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }, [rawRightItems, rawPairs, q.id, currentAnswers.__shuffledIds]);

    // PERSIST the shuffle order for the current session
    React.useEffect(() => {
        if (!currentAnswers.__shuffledIds && itemsRight.length > 0) {
            const ids = itemsRight.map(item => item.id);
            onAnswerChange(q.id, { ...currentAnswers, __shuffledIds: ids });
        }
    }, [q.id, itemsRight, currentAnswers.__shuffledIds, onAnswerChange]);

    // Correct mapping for getPairColor if we used generated IDs
    const getPairId = (itemId: string, side: 'left' | 'right') => {
        // If it's a complex object with ID, use it. If it's our generated ID, we need special handling.
        // Actually, for MatchingRenderer, we better use the CONTENT as ID if no real ID exists
        // as the student is matching content to content.
        return itemId;
    };

    // Detect Pair Color 
    const getPairColor = (itemId: string, side: 'left' | 'right') => {
        const pairs = Object.entries(currentPairs);
        const pairIndex = pairs.findIndex(([l, r]) => side === 'left' ? l === itemId : r === itemId);
        return pairIndex !== -1 ? pairColors[pairIndex % pairColors.length] : null;
    };

    return (
        <div className="grid grid-cols-2 gap-x-6 md:gap-x-12 gap-y-4">
            {/* Column A */}
            <div className="space-y-4">
                <div className="text-center font-bold text-gray-400 text-xs uppercase tracking-widest mb-4">CỘT A</div>
                {itemsLeft.map((item: any, idx: number) => {
                    const isSelected = selectedLeft === item.id;
                    const color = getPairColor(item.id, 'left');
                    return (
                        <button
                            key={item.id || idx}
                            onClick={() => onMatchingClick?.(q.id, item.id, 'left')}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all relative flex items-center min-h-[70px] shadow-sm ${
                                color ? `${color.bg} ${color.border} ${color.text} scale-[1.02] z-10` :
                                isSelected ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-100' : 'border-gray-100 bg-white hover:border-orange-200 hover:shadow-md'
                            }`}
                        >
                            <span className="flex-1 pr-4 font-medium">
                                <MathSpan content={item.content} className="text-sm md:text-base leading-snug" />
                            </span>
                            <div className={`w-4 h-4 rounded-full border-2 border-white flex-shrink-0 shadow-inner ${color ? color.dot : isSelected ? 'bg-orange-500' : 'bg-gray-200'}`} />
                        </button>
                    );
                })}
            </div>

            {/* Column B */}
            <div className="space-y-4">
                <div className="text-center font-bold text-gray-400 text-xs uppercase tracking-widest mb-4">CỘT B</div>
                {itemsRight.map((item: any, idx: number) => {
                    // Important: if we generated IDs like l-0/r-0, we must match them back to original content
                    // BUT currentPairs stores the matched IDs.
                    // For now, let's assume item.id is stable.
                    const isSelected = false; // No selection on right side in this state model
                    const color = getPairColor(item.id, 'right');
                    return (
                        <button
                            key={item.id || idx}
                            onClick={() => onMatchingClick?.(q.id, item.id, 'right')}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all relative flex items-center min-h-[70px] shadow-sm ${
                                color ? `${color.bg} ${color.border} ${color.text} scale-[1.02] z-10` :
                                isSelected ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-100' : 'border-gray-100 bg-white hover:border-orange-200 hover:shadow-md'
                            }`}
                        >
                            <div className={`w-4 h-4 rounded-full border-2 border-white flex-shrink-0 mr-4 shadow-inner ${color ? color.dot : isSelected ? 'bg-orange-500' : 'bg-gray-200'}`} />
                            <span className="flex-1 text-right pl-4 font-medium">
                                <MathSpan content={item.content} className="text-sm md:text-base leading-snug" />
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default React.memo(MatchingRenderer);
