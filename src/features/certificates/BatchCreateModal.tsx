import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Send, Loader2, ChevronDown, Users, BookOpen, Search, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { showSuccess, showError } from '../../utils/toast';
import type { BatchStudent } from './useBatches';
import { fetchTemplateOptions } from './useBatches';
import type { TemplateOption } from './useBatches';
import { WORKERS_API_URL } from '../../config/constants';
import type {
    CreateCertificateBatchRequest,
    CreateCertificateBatchResult,
} from '../../../shared/certificates.contract';

interface Props {
    onClose: () => void;
    onCreated: () => void;
    createBatch: (payload: CreateCertificateBatchRequest) => Promise<CreateCertificateBatchResult>;
}

interface ClassOption { id: string; name: string; }
interface StudentOption { id: string; fullName: string; username: string; }
interface QuizOption { id: string; title: string; }
interface ResultRecord {
    'Student Name': string;
    'Score': number;
    'Quiz ID': string;
    'Quiz Title': string;
}

function getTeacherJwt(): string {
    try {
        const direct = localStorage.getItem('itongquiz_teacher_jwt_token');
        if (direct) return direct;
        const raw = localStorage.getItem('auth-storage');
        if (!raw) return '';
        return JSON.parse(raw)?.state?.token || '';
    } catch { return ''; }
}

function authH(): HeadersInit {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${getTeacherJwt()}` };
}

const apiBase = () => (WORKERS_API_URL || '').replace(/\/$/, '');

function defaultCertificateDateLine(): string {
    const now = new Date();
    return `Mường La, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
}

const BatchCreateModal: React.FC<Props> = ({ onClose, onCreated, createBatch }) => {
    const requestIdRef = useRef(crypto.randomUUID());
    const [templates, setTemplates] = useState<TemplateOption[]>([]);
    const [templateId, setTemplateId] = useState('');
    const [title, setTitle] = useState('');
    const [customNote, setCustomNote] = useState('');
    const [achievementPrefix, setAchievementPrefix] = useState('Đã hoàn thành xuất sắc');
    const [dateLine, setDateLine] = useState(defaultCertificateDateLine);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Class + students
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [classId, setClassId] = useState('');
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [classStudents, setClassStudents] = useState<StudentOption[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Quiz + results
    const [quizzes, setQuizzes] = useState<QuizOption[]>([]);
    const [quizId, setQuizId] = useState('');
    const [results, setResults] = useState<ResultRecord[]>([]);
    const [loadingResults, setLoadingResults] = useState(false);

    // Selection + search
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');

    // On mount: load templates, classes, quizzes
    useEffect(() => {
        fetchTemplateOptions()
            .then((opts) => {
                setTemplates(opts);
                const defaultTemplate = opts.find((template) => template.is_default) ?? opts[0];
                if (defaultTemplate) setTemplateId(defaultTemplate.id);
            })
            .catch((error: unknown) => {
                showError(error instanceof Error ? error.message : 'Không thể tải mẫu chứng nhận');
            });

        setLoadingClasses(true);
        fetch(`${apiBase()}/api/classes`, { headers: authH() })
            .then(r => r.json() as Promise<{ data: ClassOption[] }>)
            .then(j => {
                const list = j.data ?? [];
                setClasses(list);
                if (list.length > 0) setClassId(list[0].id);
            })
            .catch(() => {})
            .finally(() => setLoadingClasses(false));

        fetch(`${apiBase()}/api/quizzes`, { headers: authH() })
            .then(r => r.json() as Promise<QuizOption[]>)
            .then(arr => setQuizzes(Array.isArray(arr) ? arr : []))
            .catch(() => {});
    }, []);

    // When class changes: load students
    useEffect(() => {
        if (!classId) return;
        setLoadingStudents(true);
        setClassStudents([]);
        setSelectedIds(new Set());
        fetch(`${apiBase()}/api/students?classId=${classId}`, { headers: authH() })
            .then(r => r.json() as Promise<{ data: StudentOption[] }>)
            .then(j => {
                const list = j.data ?? [];
                setClassStudents(list);
                setSelectedIds(new Set(list.map(s => s.id)));
            })
            .catch(() => {})
            .finally(() => setLoadingStudents(false));
    }, [classId]);

    // When quiz changes: load results
    useEffect(() => {
        if (!quizId || !classId) { setResults([]); return; }
        setLoadingResults(true);
        fetch(`${apiBase()}/api/results?quizId=${quizId}&limit=200`, { headers: authH() })
            .then(r => r.json() as Promise<{ data?: ResultRecord[] }>)
            .then(j => setResults(j.data ?? []))
            .catch(() => {})
            .finally(() => setLoadingResults(false));
    }, [quizId, classId]);

    // Merge students with results
    const studentRows = useMemo(() =>
        classStudents.map(s => {
            const r = results.find(r2 =>
                r2['Student Name']?.trim().toLowerCase() === s.fullName?.trim().toLowerCase()
            );
            return {
                id: s.id,
                fullName: s.fullName,
                username: s.username,
                score: r?.['Score'] ?? null,
                quizTitle: r?.['Quiz Title'] ?? (quizzes.find(q => q.id === quizId)?.title ?? null),
            };
        }),
        [classStudents, results, quizId, quizzes]
    );

    const filtered = useMemo(() =>
        studentRows.filter(s =>
            s.fullName.toLowerCase().includes(search.toLowerCase()) ||
            s.username.toLowerCase().includes(search.toLowerCase())
        ),
        [studentRows, search]
    );

    const toggleAll = useCallback(() => {
        const ids = filtered.map(s => s.id);
        setSelectedIds(prev => {
            const allSelected = ids.every(id => prev.has(id));
            const next = new Set(prev);
            if (allSelected) ids.forEach(id => next.delete(id));
            else ids.forEach(id => next.add(id));
            return next;
        });
    }, [filtered]);

    const toggleOne = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!templateId) { showError('Vui lòng chọn mẫu chứng nhận'); return; }
        if (!title.trim()) { showError('Vui lòng nhập tiêu đề'); return; }

        const selectedStudents: BatchStudent[] = studentRows
            .filter(s => selectedIds.has(s.id))
            .map(s => ({
                student_id: s.id,
                student_name: s.fullName,
                student_score: s.score,
                quiz_title: s.quizTitle,
            }));

        if (selectedStudents.length === 0) { showError('Cần chọn ít nhất 1 học sinh'); return; }

        setIsSubmitting(true);
        try {
            await createBatch({
                request_id: requestIdRef.current,
                template_id: templateId,
                title: title.trim(),
                message: customNote.trim() || undefined,
                achievement_prefix: achievementPrefix.trim(),
                date_line: dateLine.trim(),
                class_id: classId,
                quiz_id: quizId || undefined,
                student_ids: selectedStudents.map((student) => student.student_id),
            });
            showSuccess(`Đã tiếp nhận ${selectedStudents.length} chứng nhận và đang xử lý.`);
            onCreated();
        } catch (e: unknown) {
            showError(e instanceof Error ? e.message : 'Gửi thất bại');
        } finally {
            setIsSubmitting(false);
        }
    }, [templateId, title, customNote, achievementPrefix, dateLine, classId, quizId, studentRows, selectedIds, createBatch, onCreated]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">Cấp phát chứng nhận</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

                    {/* Mẫu chứng nhận */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Mẫu chứng nhận</label>
                        <div className="relative">
                            <select
                                value={templateId}
                                onChange={(e) => setTemplateId(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {templates.length === 0 && <option value="">-- Chưa có mẫu nào --</option>}
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Tiêu đề */}
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

                    {/* Ghi chú */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Ghi chú thêm <span className="font-normal text-slate-400">(tùy chọn)</span>
                        </label>
                        <input
                            type="text"
                            value={customNote}
                            onChange={(e) => setCustomNote(e.target.value)}
                            placeholder="Vd: Chúc mừng em đã hoàn thành xuất sắc!"
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-3">
                        <p className="text-sm font-semibold text-amber-900">Nội dung in trên chứng nhận</p>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Mở đầu thành tích
                            </label>
                            <input
                                type="text"
                                value={achievementPrefix}
                                maxLength={160}
                                onChange={(e) => setAchievementPrefix(e.target.value)}
                                placeholder="Đã hoàn thành xuất sắc"
                                className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                            <p className="mt-1 text-xs text-slate-500">Tên bài thi sẽ được tự động nối phía sau.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Dòng ngày cấp
                            </label>
                            <input
                                type="text"
                                value={dateLine}
                                maxLength={200}
                                onChange={(e) => setDateLine(e.target.value)}
                                placeholder="Mường La, ngày 15 tháng 7 năm 2026"
                                className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                        </div>
                    </div>

                    {/* Lớp + Bài thi */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1">
                                <Users size={13} className="text-slate-400" /> Lớp học
                            </label>
                            <div className="relative">
                                <select
                                    value={classId}
                                    onChange={e => setClassId(e.target.value)}
                                    disabled={loadingClasses}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                >
                                    {classes.length === 0 && <option value="">-- Chưa có lớp --</option>}
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-1">
                                <BookOpen size={13} className="text-slate-400" /> Bài thi{' '}
                                <span className="font-normal text-slate-400">(tùy chọn)</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={quizId}
                                    onChange={e => setQuizId(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Không chọn --</option>
                                    {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Danh sách học sinh */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-semibold text-slate-700">
                                Học sinh
                                {!loadingStudents && classStudents.length > 0 && (
                                    <span className="ml-1.5 font-normal text-slate-400">
                                        ({selectedIds.size}/{classStudents.length} đã chọn)
                                    </span>
                                )}
                            </label>
                            {loadingResults && (
                                <span className="flex items-center gap-1 text-xs text-blue-500">
                                    <Loader2 size={11} className="animate-spin" /> Đang tải điểm...
                                </span>
                            )}
                        </div>

                        {/* Search */}
                        <div className="relative mb-2">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Tìm theo tên hoặc tài khoản..."
                                className="w-full border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {loadingStudents ? (
                            <div className="space-y-2">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-9 bg-slate-100 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : classStudents.length === 0 ? (
                            <div className="flex items-center gap-2 text-sm text-slate-400 py-6 justify-center">
                                <AlertCircle size={15} /> Lớp này chưa có học sinh
                            </div>
                        ) : (
                            <div className="border border-slate-100 rounded-xl overflow-hidden">
                                {/* Chọn tất cả */}
                                <div
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100 cursor-pointer hover:bg-slate-100 select-none"
                                    onClick={toggleAll}
                                >
                                    {filtered.every(s => selectedIds.has(s.id))
                                        ? <CheckSquare size={15} className="text-blue-500" />
                                        : <Square size={15} className="text-slate-400" />
                                    }
                                    <span className="text-xs font-semibold text-slate-600">
                                        Chọn tất cả ({filtered.length})
                                    </span>
                                </div>
                                {/* Danh sách */}
                                <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                                    {filtered.map(s => (
                                        <div
                                            key={s.id}
                                            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors select-none ${
                                                selectedIds.has(s.id) ? 'bg-blue-50/40' : ''
                                            }`}
                                            onClick={() => toggleOne(s.id)}
                                        >
                                            {selectedIds.has(s.id)
                                                ? <CheckSquare size={15} className="shrink-0 text-blue-500" />
                                                : <Square size={15} className="shrink-0 text-slate-300" />
                                            }
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-800 truncate">{s.fullName}</p>
                                                <p className="text-xs text-slate-400">{s.username}</p>
                                            </div>
                                            {quizId && (
                                                <div className="shrink-0 text-right min-w-[40px]">
                                                    {s.score !== null
                                                        ? <span className="text-sm font-semibold text-emerald-600">{s.score}</span>
                                                        : <span className="text-xs text-slate-300">—</span>
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || templates.length === 0 || selectedIds.size === 0}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                        {isSubmitting
                            ? <><Loader2 size={15} className="animate-spin" /> Đang tạo...</>
                            : <><Send size={15} /> Cấp cho {selectedIds.size} học sinh</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BatchCreateModal;
