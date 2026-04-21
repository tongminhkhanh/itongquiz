import React, { useEffect, useState } from 'react';
import { X, Search, Plus, Trash2, Library, CheckCircle2 } from 'lucide-react';
import { testBankService, TestBankItem } from '../../../services/testBankService';
import type { Question } from '../../../types';

interface TestBankModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddQuestion: (q: Question) => void;
    teacherId: string;
}

export const TestBankModal: React.FC<TestBankModalProps> = ({ isOpen, onClose, onAddQuestion, teacherId }) => {
    const [items, setItems] = useState<TestBankItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen && teacherId) {
            loadBank();
        }
    }, [isOpen, teacherId]);

    const loadBank = async () => {
        try {
            setLoading(true);
            const data = await testBankService.getTestBank(teacherId);
            setItems(data);
        } catch (e) {
            console.error('Failed to load test bank', e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Bạn có chắc muốn xóa câu hỏi này khỏi ngân hàng?')) return;
        try {
            await testBankService.deleteQuestion(id);
            setItems(items.filter(item => item.id !== id));
        } catch (e) {
            alert('Không thể xóa câu hỏi');
        }
    };

    const handleAdd = (item: TestBankItem, e: React.MouseEvent) => {
        e.stopPropagation();
        // Cấp ID mới cho câu hỏi trước khi add vào list quiz hiện tại
        const newQ = { 
            ...item.question_data, 
            id: 'qa_' + Math.random().toString(36).substring(2, 9) 
        };
        onAddQuestion(newQ);
        const newSet = new Set(addedIds);
        newSet.add(item.id);
        setAddedIds(newSet);
    };

    if (!isOpen) return null;

    const filteredItems = items.filter(i => {
        // Simple search on question text (JSON dump is fine enough for basic search)
        const txt = JSON.stringify(i.question_data).toLowerCase();
        return txt.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl flex flex-col max-w-4xl w-full max-h-[90vh] overflow-hidden ml-64" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <Library className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Ngân Hàng Câu Hỏi Cá Nhân</h2>
                            <p className="text-sm text-slate-500 font-medium">Kho tài nguyên lưu trữ của riêng bạn</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm câu hỏi đang lưu trong kho..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredItems.map(item => {
                                const q = item.question_data as any;
                                const isAdded = addedIds.has(item.id);
                                return (
                                    <div key={item.id} className="group bg-white rounded-2xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all flex flex-col">
                                        <div className="flex-1 mb-4">
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                                    {q.type}
                                                </span>
                                                <button onClick={(e) => handleDelete(item.id, e)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-slate-700 font-medium line-clamp-3 text-sm">
                                                {q.mainQuestion || q.question || "[Chưa rõ tiêu đề câu hỏi]"}
                                            </p>
                                        </div>
                                        <button 
                                            disabled={isAdded}
                                            onClick={(e) => handleAdd(item, e)}
                                            className={'w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ' + (
                                            isAdded ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                                        )}>
                                            {isAdded ? (
                                                <><CheckCircle2 className="w-4 h-4" /> Đã thêm vào đề</>
                                            ) : (
                                                <><Plus className="w-4 h-4" /> Bốc vào đề</>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                            {filteredItems.length === 0 && (
                                <div className="col-span-1 md:col-span-2 py-12 flex flex-col items-center justify-center text-slate-400">
                                    <Library className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="font-medium">Chưa có câu hỏi nào trong kho dữ liệu.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
