import React, { useRef, useState } from 'react';
import { ClipboardPaste, FileSpreadsheet, Info, RotateCcw, X } from 'lucide-react';
import QuestionImportReview from '../import/QuestionImportReview';
import type { QuestionImportResult, QuizImportMetadata } from '../import/questionImport.types';
import { validateQuestionImportFile } from '../import/questionImportPolicy';
import { importQuestionJson } from '../import/jsonQuestionImporter';
import type { ManualQuizQuestion } from '../types/manualQuizWorkspace.types';
import { useManualQuizWorkspaceStore } from '../store/useManualQuizWorkspaceStore';
import { useDialogFocusTrap } from '../hooks/useDialogFocusTrap';

interface QuestionImportDrawerProps {
    open: boolean;
    onClose: () => void;
}

type RestorableQuizMetadata = {
    title: string;
    classLevel: string;
    category: string;
    timeLimit: number;
    tags: string[];
};

type ImportMode = 'file' | 'json';

const metadataEntries = (metadata: QuizImportMetadata): Array<[string, string]> => [
    ['Tên đề', metadata.title || ''],
    ['Khối/lớp', metadata.classLevel || ''],
    ['Môn/danh mục', metadata.category || ''],
    ['Thời gian', metadata.timeLimit ? `${metadata.timeLimit} phút` : ''],
    ['Thẻ', metadata.tags?.join(', ') || ''],
].filter((entry): entry is [string, string] => Boolean(entry[1]));

const QuestionImportDrawer: React.FC<QuestionImportDrawerProps> = ({ open, onClose }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const drawerRef = useRef<HTMLElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const [result, setResult] = useState<QuestionImportResult | null>(null);
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [applyMetadata, setApplyMetadata] = useState(true);
    const [mode, setMode] = useState<ImportMode>('file');
    const [jsonText, setJsonText] = useState('');
    const [lastImport, setLastImport] = useState<{
        questionIds: string[];
        previousMetadata: RestorableQuizMetadata | null;
    } | null>(null);
    const envelope = useManualQuizWorkspaceStore((state) => state.envelope);
    const addQuestions = useManualQuizWorkspaceStore((state) => state.addQuestions);
    const removeQuestions = useManualQuizWorkspaceStore((state) => state.removeQuestions);
    const updateQuiz = useManualQuizWorkspaceStore((state) => state.updateQuiz);

    useDialogFocusTrap({
        open,
        containerRef: drawerRef,
        initialFocusRef: closeButtonRef,
        onEscape: onClose,
    });

    if (!open) return null;

    const loadFile = async (file: File) => {
        setLoading(true);
        setError(null);
        setFileName(file.name);
        setLastImport(null);
        setApplyMetadata(true);
        try {
            const extension = validateQuestionImportFile(file);
            const imported = extension === 'docx'
                ? await import('../import/docxQuestionImporter').then((module) => module.importQuestionDocx(file))
                : await import('../import/spreadsheetQuestionImporter').then((module) => module.importQuestionSpreadsheet(file));
            setResult(imported);
        } catch (importError) {
            setError(importError instanceof Error ? importError.message : 'Không thể đọc tệp câu hỏi.');
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const analyzeJson = () => {
        setLoading(true);
        setError(null);
        setFileName('JSON dán từ bộ nhớ tạm');
        setLastImport(null);
        setApplyMetadata(true);
        try {
            setResult(importQuestionJson(jsonText));
        } catch (importError) {
            setError(importError instanceof Error ? importError.message : 'Không thể phân tích JSON.');
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const importQuestions = (questions: ManualQuizQuestion[]) => {
        const previousMetadata = envelope ? {
            title: envelope.quiz.title,
            classLevel: envelope.quiz.classLevel,
            category: envelope.quiz.category,
            timeLimit: envelope.quiz.timeLimit,
            tags: [...(envelope.quiz.tags || [])],
        } : null;
        addQuestions(questions);
        if (applyMetadata && result) {
            const metadataPatch = Object.fromEntries(
                Object.entries(result.metadata).filter(([, value]) => value !== undefined && value !== ''),
            );
            if (Object.keys(metadataPatch).length > 0) updateQuiz(metadataPatch);
        }
        setLastImport({
            questionIds: questions.map((question) => question.id),
            previousMetadata,
        });
    };

    const undoImport = () => {
        if (!lastImport) return;
        removeQuestions(lastImport.questionIds);
        if (lastImport.previousMetadata) updateQuiz(lastImport.previousMetadata);
        setLastImport(null);
    };

    const detectedMetadata = result ? metadataEntries(result.metadata) : [];

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35" onMouseDown={onClose}>
            <section ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Nhập câu hỏi" onMouseDown={(event) => event.stopPropagation()} className="flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl">
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 lg:px-6">
                    <div className="flex items-start gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><FileSpreadsheet className="h-5 w-5" /></span>
                        <div><h2 className="text-xl font-semibold text-slate-900">Nhập câu hỏi</h2><p className="mt-1 text-sm text-slate-600">Phân tích trước, rà soát rồi mới thêm câu hỏi vào đề.</p></div>
                    </div>
                    <button ref={closeButtonRef} type="button" aria-label="Đóng nhập câu hỏi" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
                </header>

                <div className="border-b border-slate-200 bg-slate-50 p-4">
                    <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Nguồn câu hỏi">
                        <button type="button" role="tab" aria-selected={mode === 'file'} onClick={() => { setMode('file'); setError(null); }} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${mode === 'file' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700'}`}><FileSpreadsheet className="h-4 w-4" /> Từ tệp</button>
                        <button type="button" role="tab" aria-selected={mode === 'json'} onClick={() => { setMode('json'); setError(null); }} className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${mode === 'json' ? 'bg-sky-600 text-white' : 'bg-white text-slate-700'}`}><ClipboardPaste className="h-4 w-4" /> Dán JSON</button>
                    </div>
                    {mode === 'file' ? (
                        <>
                            <input ref={inputRef} type="file" accept=".csv,.xlsx,.docx" aria-label="Chọn tệp câu hỏi" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadFile(file); }} />
                            <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-emerald-600 px-5 text-sm font-semibold text-white"><FileSpreadsheet className="h-4 w-4" /> Chọn tệp CSV, XLSX hoặc DOCX</button>
                        </>
                    ) : (
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-slate-800" htmlFor="question-json-input">JSON câu hỏi <span className="font-normal text-slate-500">(chỉ mảng [...], tối đa 200 câu)</span></label>
                            <textarea id="question-json-input" aria-label="JSON câu hỏi" value={jsonText} onChange={(event) => setJsonText(event.target.value)} rows={8} spellCheck={false} placeholder={'[\n  {"id":"Q001","question_type":"SINGLE_CHOICE",...}\n]'} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-mono text-sm leading-6 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20" />
                            <div className="flex flex-wrap items-center gap-3">
                                <button type="button" onClick={analyzeJson} disabled={!jsonText.trim() || loading} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-sky-600 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><ClipboardPaste className="h-4 w-4" /> Phân tích JSON</button>
                                <button type="button" onClick={() => { setJsonText(''); setResult(null); setError(null); }} className="min-h-11 rounded-[10px] border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700">Xóa nội dung</button>
                                <p className="text-xs text-slate-500">LaTeX trong JSON cần escape dấu gạch chéo, ví dụ <code>\\frac</code>.</p>
                            </div>
                        </div>
                    )}
                    {fileName && <span className="ml-3 text-sm text-slate-600">{fileName}</span>}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-6">
                    {loading && <div role="status" className="grid min-h-48 place-items-center text-sm text-slate-500">Đang phân tích tệp…</div>}
                    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
                    {!loading && !error && !result && <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 text-center text-sm text-slate-500">Chọn một tệp để xem trước các câu hỏi trước khi nhập.</div>}
                    {!loading && result && detectedMetadata.length > 0 && (
                        <section aria-label="Thông tin đề nhận diện được" className="mb-5 rounded-xl border border-sky-200 bg-sky-50 p-4">
                            <div className="flex items-start gap-3">
                                <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-sky-950">Thông tin đề nhận diện được</h3>
                                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                                        {detectedMetadata.map(([label, value]) => (
                                            <div key={label}>
                                                <dt className="text-sky-700">{label}</dt>
                                                <dd className="font-medium text-slate-900">{value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                    <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-medium text-sky-900">
                                        <input
                                            type="checkbox"
                                            checked={applyMetadata}
                                            onChange={(event) => setApplyMetadata(event.target.checked)}
                                            className="h-4 w-4 accent-sky-700"
                                        />
                                        Áp dụng thông tin này cho đề đang soạn
                                    </label>
                                </div>
                            </div>
                        </section>
                    )}
                    {!loading && result && result.warnings.length > 0 && (
                        <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            <strong>Cần lưu ý:</strong>
                            <ul className="mt-2 list-disc space-y-1 pl-5">
                                {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                            </ul>
                        </div>
                    )}
                    {!loading && result && <QuestionImportReview key={fileName} result={result} onImport={importQuestions} />}
                </div>

                {lastImport && lastImport.questionIds.length > 0 && (
                    <footer role="status" className="flex items-center justify-between gap-4 border-t border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 lg:px-6">
                        <span>Đã nhập {lastImport.questionIds.length} câu vào đề. Câu hỏi sẽ được lưu vào D1 khi xuất bản đề.</span>
                        <button type="button" aria-label="Hoàn tác nhập câu hỏi" onClick={undoImport} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-3 font-semibold"><RotateCcw className="h-4 w-4" /> Hoàn tác</button>
                    </footer>
                )}
            </section>
        </div>
    );
};

export default QuestionImportDrawer;
