import React, { useEffect, useState } from 'react';
import { Clock3, Settings2, X } from 'lucide-react';
import type { ManualQuiz } from '../types/manualQuizWorkspace.types';

interface QuizSettingsDialogProps {
    open: boolean;
    quiz: ManualQuiz;
    onClose: () => void;
    onSave: (settings: { classLevel: string; timeLimit: number }) => void;
}

const QUICK_TIMES = [15, 30, 45, 60];
const CLASS_LEVELS = ['1', '2', '3', '4', '5'];

const QuizSettingsDialog: React.FC<QuizSettingsDialogProps> = ({ open, quiz, onClose, onSave }) => {
    const [classLevel, setClassLevel] = useState(quiz.classLevel || '3');
    const [timeLimit, setTimeLimit] = useState(String(quiz.timeLimit || 15));
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setClassLevel(quiz.classLevel || '3');
        setTimeLimit(String(quiz.timeLimit || 15));
        setError(null);
    }, [open, quiz.classLevel, quiz.timeLimit]);

    if (!open) return null;

    const save = () => {
        const parsed = Number(timeLimit);
        if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 600) {
            setError('Thời gian phải là số nguyên từ 1 đến 600 phút.');
            return;
        }
        onSave({ classLevel: classLevel.trim() || '3', timeLimit: parsed });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" onMouseDown={onClose}>
            <section role="dialog" aria-modal="true" aria-label="Thiết lập đề" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700"><Settings2 className="h-5 w-5" /></span><div><h2 className="text-lg font-semibold text-slate-900">Thiết lập đề</h2><p className="mt-1 text-sm text-slate-500">Chọn khối/lớp và thời gian làm bài.</p></div></div>
                    <button type="button" aria-label="Đóng thiết lập đề" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
                </header>
                <div className="space-y-5 px-5 py-5">
                    <label className="block text-sm font-semibold text-slate-800">Khối/lớp áp dụng
                        <select value={CLASS_LEVELS.includes(classLevel) ? classLevel : classLevel} onChange={(event) => setClassLevel(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal outline-none focus:border-sky-500">
                            {!CLASS_LEVELS.includes(classLevel) && <option value={classLevel}>{classLevel}</option>}
                            {CLASS_LEVELS.map((level) => <option key={level} value={level}>Lớp {level}</option>)}
                        </select>
                        <span className="mt-1 block text-xs font-normal text-slate-500">Đây là khối/lớp của đề; lớp nhận bài cụ thể được chọn ở bước Giao bài.</span>
                    </label>
                    <div>
                        <label className="block text-sm font-semibold text-slate-800" htmlFor="manual-quiz-time-limit"><Clock3 className="mr-1 inline h-4 w-4" />Thời gian làm bài</label>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {QUICK_TIMES.map((minutes) => <button key={minutes} type="button" onClick={() => setTimeLimit(String(minutes))} className={`min-h-10 rounded-lg border text-sm font-semibold ${Number(timeLimit) === minutes ? 'border-sky-600 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-700'}`}>{minutes} phút</button>)}
                        </div>
                        <input id="manual-quiz-time-limit" type="number" min={1} max={600} step={1} value={timeLimit} onChange={(event) => setTimeLimit(event.target.value)} className="mt-3 h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-sky-500" />
                        <p className="mt-1 text-xs text-slate-500">Nhập số nguyên từ 1 đến 600 phút. Thời gian trên 180 phút sẽ được cảnh báo khi kiểm tra đề.</p>
                    </div>
                    {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
                </div>
                <footer className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4"><button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700">Hủy</button><button type="button" onClick={save} className="min-h-11 rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white hover:bg-sky-700">Lưu thiết lập</button></footer>
            </section>
        </div>
    );
};

export default QuizSettingsDialog;
