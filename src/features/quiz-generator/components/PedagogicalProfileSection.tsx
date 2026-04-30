import React from 'react';
import { BookMarked, GraduationCap, HeartHandshake, ShieldCheck } from 'lucide-react';
import CollapsibleSection from './CollapsibleSection';
import type { LearnerPromptMode, PromptProfileOptions } from '../../../services/geminiService';

interface PedagogicalProfileSectionProps {
    promptProfile: PromptProfileOptions;
    profilePresetNotice: string | null;
    isOpen: boolean;
    onToggle: (id: string) => void;
    onToggleThongTu27: () => void;
    onSelectLearnerMode: (mode: LearnerPromptMode) => void;
}

const baseCardClass =
    'w-full rounded-2xl border p-4 text-left transition-all shadow-sm hover:-translate-y-0.5';

const PedagogicalProfileSection: React.FC<PedagogicalProfileSectionProps> = ({
    promptProfile,
    profilePresetNotice,
    isOpen,
    onToggle,
    onToggleThongTu27,
    onSelectLearnerMode,
}) => {
    const isThongTu27Enabled = promptProfile.useThongTu27;

    return (
        <CollapsibleSection
            id="pedagogy"
            icon={<BookMarked className="w-4 h-4" />}
            title="Dinh huong ra de"
            subtitle="Thong tu 27, boi duong gioi, phu dao hoc sinh"
            isOpen={isOpen}
            onToggle={onToggle}
        >
            <div className="space-y-3">
                <button
                    type="button"
                    onClick={onToggleThongTu27}
                    className={`${baseCardClass} ${
                        isThongTu27Enabled
                            ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-blue-100'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                >
                    <div className="flex items-start gap-3">
                        <div className={`rounded-xl p-2 ${isThongTu27Enabled ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between gap-3">
                                <h4 className="text-sm font-bold">Bam Thong tu 27</h4>
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                                    isThongTu27Enabled ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {isThongTu27Enabled ? 'Dang bat' : 'Dang tat'}
                                </span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-600">
                                Bam chuan danh gia tieu hoc, ngon ngu phu hop lua tuoi, uu tien cau hoi co y nghia hoc tap va phan hoa hop ly.
                            </p>
                        </div>
                    </div>
                </button>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <button
                        type="button"
                        disabled={!isThongTu27Enabled}
                        onClick={() => onSelectLearnerMode(promptProfile.learnerMode === 'gifted' ? 'default' : 'gifted')}
                        className={`${baseCardClass} ${
                            promptProfile.learnerMode === 'gifted'
                                ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-amber-100'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        } ${!isThongTu27Enabled ? 'cursor-not-allowed opacity-50 hover:translate-y-0' : ''}`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`rounded-xl p-2 ${promptProfile.learnerMode === 'gifted' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                <GraduationCap className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold">Boi duong hoc sinh gioi</h4>
                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                    Tang cau suy luan va van dung, nghieng ro sang boi duong nhom kha gioi trong pham vi tieu hoc.
                                </p>
                                {!isThongTu27Enabled && (
                                    <p className="mt-2 text-[11px] font-medium text-slate-400">
                                        Bat Thong tu 27 de su dung profile nay.
                                    </p>
                                )}
                            </div>
                        </div>
                    </button>

                    <button
                        type="button"
                        disabled={!isThongTu27Enabled}
                        onClick={() => onSelectLearnerMode(promptProfile.learnerMode === 'remedial' ? 'default' : 'remedial')}
                        className={`${baseCardClass} ${
                            promptProfile.learnerMode === 'remedial'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-emerald-100'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        } ${!isThongTu27Enabled ? 'cursor-not-allowed opacity-50 hover:translate-y-0' : ''}`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`rounded-xl p-2 ${promptProfile.learnerMode === 'remedial' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                <HeartHandshake className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold">Phu dao hoc sinh yeu kem</h4>
                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                    Uu tien kien thuc cot loi, tang cau nhan biet va thong hieu gan, giam nhieu gay roi.
                                </p>
                                {!isThongTu27Enabled && (
                                    <p className="mt-2 text-[11px] font-medium text-slate-400">
                                        Bat Thong tu 27 de su dung profile nay.
                                    </p>
                                )}
                            </div>
                        </div>
                    </button>
                </div>

                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Trang thai hien tai</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                        {!isThongTu27Enabled
                            ? 'Dang dung che do tao de thong thuong.'
                            : promptProfile.learnerMode === 'gifted'
                                ? 'Dang dung chuan Thong tu 27 va profile boi duong hoc sinh gioi.'
                                : promptProfile.learnerMode === 'remedial'
                                    ? 'Dang dung chuan Thong tu 27 va profile phu dao hoc sinh yeu kem.'
                                    : 'Dang dung chuan Thong tu 27.'}
                    </p>
                    {profilePresetNotice && (
                        <p className="mt-2 text-xs text-slate-500">{profilePresetNotice}</p>
                    )}
                </div>
            </div>
        </CollapsibleSection>
    );
};

export default PedagogicalProfileSection;
