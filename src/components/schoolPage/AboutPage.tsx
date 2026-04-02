import React from 'react';
import { Award, Building2, CalendarDays, Flag, School, Sparkles, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const milestones = [
    { year: '2016', title: 'Khởi động hành trình', desc: 'Trường bắt đầu xây dựng môi trường học tập thân thiện và sáng tạo.' },
    { year: '2019', title: 'Nâng cấp cơ sở vật chất', desc: 'Hoàn thiện phòng học thông minh, thư viện mở và không gian trải nghiệm.' },
    { year: '2023', title: 'Đẩy mạnh chuyển đổi số', desc: 'Ứng dụng nền tảng học tập trực tuyến và đánh giá tiến bộ theo năng lực.' },
    { year: '2026', title: 'Hướng tới trường học hạnh phúc', desc: 'Tập trung vào trải nghiệm học sinh, kết nối phụ huynh và cộng đồng.' },
];

const gallery = [
    'Ngày hội đọc sách',
    'Sân chơi STEM',
    'Hoạt động ngoại khóa',
    'Giờ học sáng tạo',
    'Lễ tổng kết năm học',
    'CLB văn nghệ',
];

const achievements = [
    'Top phong trào đổi mới dạy học cấp huyện',
    'Nhiều học sinh đạt giải cấp huyện, cấp tỉnh',
    'Liên tục đạt tập thể lao động tiên tiến',
];

const AboutPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#eff6ff_35%,#f8fafc_100%)] text-slate-800">
            <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 border-b border-blue-100">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="font-black text-slate-800 tracking-tight text-lg hover:text-blue-600 transition-colors"
                    >
                        ÍtOng<span className="text-orange-500">Quiz</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/')}
                            className="px-4 py-2 rounded-full text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                            Trang chủ
                        </button>
                        <button
                            onClick={() => navigate('/about')}
                            className="px-4 py-2 rounded-full text-sm font-semibold text-blue-700 bg-blue-100"
                        >
                            Giới thiệu
                        </button>
                        <button
                            onClick={() => navigate('/contact')}
                            className="px-4 py-2 rounded-full text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                            Liên hệ
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14 space-y-12">
                <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 p-8 md:p-12 text-white shadow-2xl">
                    <div className="absolute -top-16 -right-12 w-52 h-52 rounded-full bg-white/20 blur-2xl" />
                    <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-cyan-300/30 blur-2xl" />
                    <div className="relative z-10 max-w-3xl">
                        <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-widest mb-4">
                            <Sparkles className="w-3.5 h-3.5" />
                            Giới thiệu nhà trường
                        </p>
                        <h1 className="text-3xl md:text-5xl font-black leading-tight mb-4">
                            Trường Tiểu học Ít Ong
                        </h1>
                        <p className="text-blue-100 text-base md:text-lg leading-relaxed">
                            Chúng tôi xây dựng môi trường học tập an toàn, nhân ái và truyền cảm hứng.
                            Học sinh được tôn trọng sự khác biệt, được khuyến khích sáng tạo và phát triển toàn diện.
                        </p>
                    </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="rounded-2xl bg-white border border-blue-100 p-6 shadow-sm">
                        <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                            <School className="w-6 h-6" />
                        </div>
                        <h3 className="font-black text-lg mb-2">Tầm nhìn</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">Đào tạo thế hệ học sinh tự tin, có kỹ năng học tập suốt đời.</p>
                    </div>
                    <div className="rounded-2xl bg-white border border-blue-100 p-6 shadow-sm">
                        <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                            <Flag className="w-6 h-6" />
                        </div>
                        <h3 className="font-black text-lg mb-2">Sứ mệnh</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">Kết hợp nền tảng số và phương pháp dạy học tích cực vì học sinh.</p>
                    </div>
                    <div className="rounded-2xl bg-white border border-blue-100 p-6 shadow-sm">
                        <div className="w-11 h-11 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center mb-4">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <h3 className="font-black text-lg mb-2">Giá trị cốt lõi</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">Tôn trọng, hợp tác, kỷ luật tích cực, trách nhiệm và sáng tạo.</p>
                    </div>
                </section>

                <section className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                            <CalendarDays className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-black">Hành trình phát triển</h2>
                    </div>
                    <div className="space-y-5">
                        {milestones.map((item) => (
                            <div key={item.year} className="flex gap-4">
                                <div className="w-20 shrink-0 text-sm font-black text-blue-600">{item.year}</div>
                                <div className="flex-1 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                                    <h3 className="font-bold text-slate-800 mb-1">{item.title}</h3>
                                    <p className="text-sm text-slate-600">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-black">Bảng vàng thành tích</h2>
                        </div>
                        <ul className="space-y-3">
                            {achievements.map((item) => (
                                <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                                    <Award className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-sm">
                        <h2 className="text-xl font-black mb-4">Thư viện hình ảnh hoạt động</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {gallery.map((item) => (
                                <div
                                    key={item}
                                    className="aspect-square rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-3 flex items-end"
                                >
                                    <p className="text-xs font-bold text-slate-700 leading-snug">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default AboutPage;
