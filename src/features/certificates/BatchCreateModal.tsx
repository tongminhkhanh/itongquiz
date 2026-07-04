import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Send, Loader2, ChevronDown } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import type { BatchStudent } from './useBatches';
import { fetchTemplateOptions } from './useBatches';
import type { TemplateOption } from './useBatches';

interface Props {
    onClose: () => void;
    onCreated: () => void;
    createBatch: (payload: {
        template_id: string;
        title: string;
        custom_note?: string;
        students: BatchStudent[];
    }) => Promise<{ batch_id: string }>;
}

const emptyStudent = (): BatchStudent => ({
    student_id: '',
    student_name: '',
    student_score: null,
    quiz_title: null,
});

const BatchCreateModal: React.FC<Props> = ({ onClose, onCreated, createBatch }) => {
    const [templates, setTemplates] = useState<TemplateOption[]>([]);
    const [templateId, setTemplateId] = useState('');
    const [title, setTitle] = useState('');
    const [customNote, setCustomNote] = useState('');
    const [students, setStudents] = useState<BatchStudent[]>([emptyStudent()]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchTemplateOptions().then((opts) => {
            setTemplates(opts);
            if (opts.length > 0) setTemplateId(opts[0].id);
        });
    }, []);

    const addStudent = useCallback(() => {
        setStudents((prev) => [...prev, emptyStudent()]);
    }, []);

    const removeStudent = useCallback((idx: number) => {
        setStudents((prev) => prev.filter((_, i) => i !== idx));
    }, []);

    const updateStudent = useCallback((idx: number, field: keyof BatchStudent, value: string) => {
        setStudents((prev) =>
            prev.map((s, i) =>
                i === idx
                    ? { ...s, [field]: field === 'student_score' ? (value === '' ? null : Number(value)) : value }
                    : s
            )
        );
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!templateId) { showError('Vui lòng chọn mẫu chứng nhận'); return; }
        if (!title.trim()) { showError('Vui lòng nhập tiêu đề'); return; }
        const valid = students.filter((s) => s.student_name.trim() && s.student_id.trim());
        if (valid.length === 0) { showError('Cần ít nhất 1 học sinh hợp lệ'); return; }

        setIsSubmitting(true);
        try {
            await createBatch({
                template_id: templateId,
                title: title.trim(),
                custom_note: customNote.trim() || undefined,
                students: valid,
            });
            showSuccess(`Đã gửi chứng nhận cho ${valid.length} học sinh!`);
            onCreated();
        } catch (e: unknown) {
            showError(e instanceof Error ? e.message : 'Gửi thất bại');
        } finally {
            setIsSubmitting(false);
        }
    }, [templateId, title, customNote, students, createBatch, onCreated]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">Cấp phát chứng nhận</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                    {/* Template */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Mẫu chứng nhận</label>
                        <div className="relative">
                            <select
                                value={templateId}
                                onChange={(e) => setTemplateId(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {templates.length === 0 && (
                                    <option value="">-- Chưa có mẫu nào --</option>
                                )}
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Tiêu đề đợt cấp</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Vd: Kết quả kỳ thi Toán tháng 6"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Custom note */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Ghi chú thêm <span className="font-normal text-slate-400">(tùy chọn)</span></label>
                        <input
                            type="text"
                            value={customNote}
                            onChange={(e) => setCustomNote(e.target.value)}
                            placeholder="Vd: Chúc mừng em đã hoàn thành xuất sắc!"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Students */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-semibold text-slate-700">Danh sách học sinh ({students.length})</label>
                            <button
                                onClick={addStudent}
                                disabled={students.length >= 100}
                                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40"
                            >
                                <Plus size={13} /> Thêm HS
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 px-1">
                                <div className="col-span-3">Mã HS</div>
                                <div className="col-span-4">Họ tên</div>
                                <div className="col-span-2">Điểm</div>
                                <div className="col-span-2">Bài thi</div>
                                <div className="col-span-1"></div>
                            </div>
                            {students.map((s, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                    <input
                                        className="col-span-3 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        placeholder="student_id"
                                        value={s.student_id}
                                        onChange={(e) => updateStudent(idx, 'student_id', e.target.value)}
                                    />
                                    <input
                                        className="col-span-4 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        placeholder="Họ và tên"
                                        value={s.student_name}
                                        onChange={(e) => updateStudent(idx, 'student_name', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        className="col-span-2 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        placeholder="10"
                                        value={s.student_score ?? ''}
                                        onChange={(e) => updateStudent(idx, 'student_score', e.target.value)}
                                    />
                                    <input
                                        className="col-span-2 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        placeholder="Tên bài"
                                        value={s.quiz_title ?? ''}
                                        onChange={(e) => updateStudent(idx, 'quiz_title', e.target.value)}
                                    />
                                    <button
                                        onClick={() => removeStudent(idx)}
                                        disabled={students.length === 1}
                                        className="col-span-1 flex justify-center text-red-400 hover:text-red-600 disabled:opacity-30"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Huỷ
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
                    >
                        {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                        Gửi chứng nhận
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BatchCreateModal;
