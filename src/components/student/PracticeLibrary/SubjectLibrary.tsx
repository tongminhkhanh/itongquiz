import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Search, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { practiceService } from '../../../services/practiceService';
import TopicCard from './TopicCard';
import { SUBJECT_CONFIG } from '../../HomePage/StudentDashboardUI';
import { useQuizStore } from '../../../../stores/quizStore';

interface SubjectLibraryProps {
    subjectId: string; // 'toan', 'tieng-viet', etc.
    onBack: () => void;
}

const SubjectLibrary: React.FC<SubjectLibraryProps> = ({ subjectId, onBack }) => {
    const subject = SUBJECT_CONFIG[subjectId];
    const quizStore = useQuizStore();

    const [topics, setTopics] = useState<{ name: string; count: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchTopics = async () => {
            setIsLoading(true);
            try {
                const allTopics = await practiceService.getTopics();

                // Define tag-to-subject mapping
                const subjectMapping: Record<string, string[]> = {
                    'toan': ['#toan', '#toán', '#phep_nhan', '#phan_so', '#hinh_hoc', '#gia_tri', '#biu_thức', '#quy_dong', '#rut_gon_phan_so', '#so_sanh_phan_so', '#lam_tron_so', '#hinh_binh_hanh', '#phep_chia', '#phep_cong', '#phep_tru'],
                    'tieng-viet': ['#tieng_viet', '#tiếng_việt', '#trạng_nguyên', '#vi_ngữ', '#chủ_ngữ', '#luyện_từ_và_câu', '#từ_đơn', '#từ_phức', '#ngu_phap', '#gia_dinh', '#tu_vung', '#tap_doc', '#chinh_ta'],
                    'tieng-anh': ['#tieng_anh', '#anh_van', '#english', '#grammar', '#vocabulary'],
                    'tn-xh': ['#khoa_hoc', '#tu_nhien', '#xa_hoi', '#tn_xh', '#tự_nhiên_xã_hội', '#lịch_sử', '#địa_lý'],
                    'tin-hoc': ['#tin_hoc', '#coding', '#scratch', '#may_tinh']
                };

                const relevantTags = subjectMapping[subjectId] || [];

                // Filter topics that belong to this subject
                // If the tag name matches any of the relevantTags or if it contains the tag as a substring
                const filtered = allTopics.filter(t =>
                    relevantTags.some(rt => t.name.toLowerCase().includes(rt.toLowerCase())) ||
                    t.name.toLowerCase().includes(subjectId.replace('-', '_'))
                );

                setTopics(filtered);
            } catch (error) {
                console.error("Failed to load topics", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTopics();
    }, [subjectId]);

    const handleStartPractice = async (topic: string) => {
        setIsLoading(true);
        const virtualQuiz = await practiceService.getPracticeQuiz(topic, 10);
        setIsLoading(false);

        if (virtualQuiz) {
            quizStore.selectQuiz(virtualQuiz);
            quizStore.setView('student');
        } else {
            alert('Không thể tải bài luyện tập. Vui lòng thử lại.');
        }
    };

    const filteredTopics = topics.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.name.replace(/_/g, ' ').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!subject) return null;

    return (
        <div className="min-h-screen bg-[#F4F7FC] font-sans text-slate-800 flex flex-col items-center">
            {/* HEADER */}
            <header className={`w-full bg-gradient-to-r ${subject.color} shadow-md sticky top-0 z-40`}>
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between text-white">
                    <button
                        onClick={onBack}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm shadow-sm flex items-center gap-2 pr-4 font-bold"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Trở về</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-3xl">{subject.icon}</span>
                        <h1 className="text-xl md:text-2xl font-black">{subject.title}</h1>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 flex-1 flex flex-col gap-8">

                {/* Intro & Search */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-2 mb-2">
                            <Zap className="w-8 h-8 text-amber-500" />
                            Ôn tập Chuyên đề
                        </h2>
                        <p className="text-slate-500 font-medium text-lg">
                            Chọn thẻ học bên dưới để làm 10 câu hỏi ngẫu nhiên và nâng trình ngay nhé!
                        </p>
                    </div>

                    <div className="relative w-full md:w-80">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm chủ đề (vd: phép nhân)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-medium text-slate-700 outline-none shadow-sm"
                        />
                    </div>
                </div>

                {/* Topics Grid */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                        <p className="text-slate-500 font-medium animate-pulse">Đang tải các chuyên đề...</p>
                    </div>
                ) : filteredTopics.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <AnimatePresence>
                            {filteredTopics.map((topic, i) => (
                                <TopicCard
                                    key={topic.name}
                                    topic={topic.name}
                                    count={topic.count}
                                    index={i}
                                    onClick={handleStartPractice}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center flex flex-col items-center justify-center">
                        <div className="text-5xl mb-4 opacity-50">🕵️‍♂️</div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">Không tìm thấy chuyên đề</h3>
                        <p className="text-slate-500 font-medium">Chưa có dữ liệu hoặc không khớp với tìm kiếm của em.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SubjectLibrary;
