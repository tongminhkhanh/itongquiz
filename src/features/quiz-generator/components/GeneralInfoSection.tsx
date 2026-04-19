import React from 'react';
import { FileText, Clock, Tag, X, Lock } from 'lucide-react';
import CollapsibleSection from './CollapsibleSection';
import { QUIZ_CATEGORIES } from '../../../config/constants';

interface GeneralInfoSectionProps {
    topic: string;
    setTopic: (v: string) => void;
    quizTitle: string;
    setQuizTitle: (v: string) => void;
    classLevel: string;
    setClassLevel: (v: string) => void;
    manualTimeLimit: number | '';
    setManualTimeLimit: (v: number | '') => void;
    category: string;
    setCategory: (v: string) => void;
    tags: string[];
    setTags: (v: string[]) => void;
    tagInput: string;
    setTagInput: (v: string) => void;
    isOpen: boolean;
    onToggle: (id: string) => void;
    isClassLocked: boolean;
    isPdfMode: boolean;
    aiSuggestions: {
        category: string | null;
        lesson: string;
        tags: string[];
    };
    onApplyAiCategory: () => void;
    onApplyAiTitle: () => void;
    onAddTag: (tag: string) => void;
}

const GeneralInfoSection: React.FC<GeneralInfoSectionProps> = ({
    topic, setTopic, quizTitle, setQuizTitle, classLevel, setClassLevel,
    manualTimeLimit, setManualTimeLimit, category, setCategory,
    tags, setTags, tagInput, setTagInput, isOpen, onToggle,
    isClassLocked, isPdfMode, aiSuggestions,
    onApplyAiCategory, onApplyAiTitle, onAddTag
}) => {
    return (
        <CollapsibleSection
            id="basic"
            icon={<FileText className="w-4 h-4" />}
            title="Thông tin cơ bản"
            subtitle="Chủ đề, khối lớp, thời gian"
            isOpen={isOpen}
            onToggle={onToggle}
        >
            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Chủ đề bài học {!isPdfMode && <span className="text-red-500">*</span>}
                    </label>
                    <input
                        type="text"
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="VD: Động vật rừng xanh, Phép cộng có nhớ..."
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tên bài kiểm tra</label>
                    <input
                        type="text"
                        value={quizTitle}
                        onChange={e => setQuizTitle(e.target.value)}
                        placeholder="VD: Kiểm tra 15 phút - Chương 3..."
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all text-sm"
                    />
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            Khối lớp {isClassLocked && <Lock className="w-3 h-3 inline text-orange-500" />}
                        </label>
                        <select
                            value={classLevel}
                            onChange={e => setClassLevel(e.target.value)}
                            disabled={isClassLocked}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500/40 ${isClassLocked ? 'bg-gray-50 cursor-not-allowed text-gray-500' : 'border-gray-200'}`}
                        >
                            {[1, 2, 3, 4, 5].map(l => <option key={l} value={String(l)}>Lớp {l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                            <Clock className="w-3 h-3 inline mr-1" />Thời gian
                        </label>
                        <input
                            type="number"
                            value={manualTimeLimit}
                            onChange={e => {
                                const val = e.target.value;
                                setManualTimeLimit(val === '' ? '' : parseInt(val, 10));
                            }}
                            placeholder="Tự động"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/40"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Danh mục</label>
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/40"
                        >
                            {QUIZ_CATEGORIES.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                        <Tag className="w-3 h-3 inline mr-1" />Nhãn (Tags)
                    </label>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                        {tags.map((tag, idx) => (
                            <span key={idx} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                                {tag}
                                <button onClick={() => setTags(tags.filter((_, i) => i !== idx))} className="ml-0.5 hover:text-red-500">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => {
                            if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                                e.preventDefault();
                                onAddTag(tagInput);
                                setTagInput('');
                            }
                        }}
                        placeholder="Gõ tag rồi nhấn Enter"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/40"
                    />
                </div>
                
                {/* AI Suggestions UI... (omitted for brevity in prompt but I'll include it in file) */}
                {(aiSuggestions.category || aiSuggestions.lesson || aiSuggestions.tags.length > 0) && (
                    <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 space-y-2">
                         <p className="text-xs font-semibold text-emerald-700">AI Suggestions:</p>
                         {aiSuggestions.category && (
                             <button onClick={onApplyAiCategory} className="text-xs font-semibold bg-emerald-600 text-white px-2 py-1 rounded">Apply {aiSuggestions.category}</button>
                         )}
                         {aiSuggestions.lesson && (
                             <button onClick={onApplyAiTitle} className="text-xs font-semibold border border-emerald-300 text-emerald-700 px-2 py-1 rounded ml-2">Apply {aiSuggestions.lesson}</button>
                         )}
                    </div>
                )}
            </div>
        </CollapsibleSection>
    );
};

export default GeneralInfoSection;
