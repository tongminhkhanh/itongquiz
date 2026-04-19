import React from 'react';
import { BaseRendererProps } from '../types';
import SmartText from '../utils/SmartText';

/**
 * DragDropRenderer: Renders a classification question where items 
 * are moved into categories.
 * 
 * Note: While named DragDrop, this implementation uses a click-to-assign 
 * pattern optimized for both touch and mouse without heavy DnD libraries.
 */
const DragDropRenderer: React.FC<BaseRendererProps> = ({
    question: q,
    answers,
    onAnswerChange,
}) => {
    const categories = (q as any).categories || [];
    const items = (q as any).items || [];
    const currentAssignments = (answers[q.id] as Record<string, string>) || {};

    // Helper to get assigned items for a specific category
    const getItemsInCategory = (categoryId: string) => {
        return items.filter((item: any) => currentAssignments[item.id] === categoryId);
    };

    // Helper to check if an item is unassigned
    const unassignedItems = items.filter((item: any) => !currentAssignments[item.id]);

    const handleAssign = (itemId: string, categoryId: string | null) => {
        const newAssignments = { ...currentAssignments };
        if (categoryId === null) {
            delete newAssignments[itemId];
        } else {
            newAssignments[itemId] = categoryId;
        }
        onAnswerChange(q.id, newAssignments);
    };

    return (
        <div className="space-y-8">
            {/* Category Zones - Premium Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map((cat: any) => (
                    <div 
                        key={cat.id} 
                        className="bg-indigo-50/30 rounded-3xl border-2 border-dashed border-indigo-200 p-5 min-h-[200px] flex flex-col shadow-inner transition-all hover:bg-indigo-50/50"
                    >
                        <div className="text-center font-bold text-indigo-700 mb-4 flex flex-col items-center gap-2">
                            <span className="px-3 py-1 bg-indigo-500 text-white text-[10px] rounded-full uppercase tracking-widest shadow-sm">NHÓM</span>
                            <div className="text-lg">
                                <SmartText content={cat.name} />
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 content-start flex-1">
                            {getItemsInCategory(cat.id).map((item: any) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleAssign(item.id, null)}
                                    className="bg-white px-4 py-2 rounded-xl border-2 border-indigo-100 shadow-sm text-sm font-medium hover:border-red-300 hover:text-red-500 hover:shadow-md transition-all animate-in zoom-in-90 active:scale-95"
                                >
                                    <SmartText content={item.content} />
                                </button>
                            ))}
                            {getItemsInCategory(cat.id).length === 0 && (
                                <div className="w-full h-full flex items-center justify-center text-indigo-300 text-sm italic py-12 opacity-60">
                                    Thả vào đây...
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Source Pool (Unassigned Items) */}
            <div className="bg-white rounded-3xl p-6 border-2 border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        📦 Danh sách mục ({unassignedItems.length})
                    </p>
                    {unassignedItems.length > 0 && (
                        <span className="text-[10px] text-gray-400 animate-pulse">Nhấp để phân loại</span>
                    )}
                </div>
                
                <div className="flex flex-wrap gap-4">
                    {unassignedItems.map((item: any) => (
                        <div key={item.id} className="relative group">
                            <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-sm flex flex-col gap-4 min-w-[140px] items-center transition-all group-hover:border-indigo-300 group-hover:shadow-md">
                                <div className="text-base font-semibold text-gray-800">
                                    <SmartText content={item.content} />
                                </div>
                                
                                <div className="flex gap-2 w-full">
                                    {categories.map((cat: any) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleAssign(item.id, cat.id)}
                                            className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 text-[10px] font-bold rounded-lg transition-all border border-indigo-100 hover:border-indigo-600 active:scale-95"
                                        >
                                            <SmartText content={cat.name} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                    {unassignedItems.length === 0 && (
                        <div className="w-full text-center py-6 text-green-500 font-bold flex items-center justify-center gap-2 animate-bounce">
                            ✨ Đã phân loại xong tất cả!
                        </div>
                    )}
                </div>
            </div>
            
            <p className="text-center text-xs text-gray-400 italic">
                * Mẹo: Nhấn vào các mục đã phân loại để bỏ chọn và đưa về kho.
            </p>
        </div>
    );
};

export default React.memo(DragDropRenderer);
