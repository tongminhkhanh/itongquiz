import React from 'react';
import { useQuizStore } from '../../../stores/quizStore';

const LandingPage: React.FC = () => {
    const setView = useQuizStore(state => state.setView);

    return (
        <div className="text-slate-800 antialiased bg-[#FDFCF7] min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
            <style>
                {`
                .serif-font {
                    font-family: 'Playfair Display', serif;
                }
                .hero-shape {
                    clip-path: polygon(25% 0%, 100% 0%, 100% 100%, 0% 100%);
                    border-radius: 40px;
                }
                .bg-sage {
                    background-color: #10B981;
                }
                .text-sage {
                    color: #10B981;
                }
                .bg-navy {
                    background-color: #1E3A8A;
                }
                `}
            </style>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#FDFCF7]/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-sage rounded-lg flex items-center justify-center text-white font-bold">iT</div>
                        <span className="text-xl font-bold tracking-tight">
                            <span style={{ color: '#1e3a8a' }}>ítong</span><span style={{ color: '#FACC15' }}>Quiz</span>
                        </span>
                    </div>

                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                        <a href="#" className="hover:text-sage transition">Luyện tập</a>
                        <a href="#" className="hover:text-sage transition">Chủ đề học</a>
                        <a href="#" className="hover:text-sage transition">Bảng xếp hạng</a>
                        <a href="#" className="hover:text-sage transition">Giới thiệu</a>
                    </nav>

                    <div className="flex items-center gap-4">
                        <button className="text-sm font-semibold hover:text-sage px-4">Đăng nhập</button>
                        <button
                            onClick={() => setView('home')}
                            className="bg-sage text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-emerald-600 transition shadow-sm">Bắt
                            đầu luyện tập</button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 items-center gap-12">
                <div className="space-y-8">
                    <h1 className="text-5xl md:text-6xl leading-tight serif-font">Ôn bài và luyện tập kiến thức mỗi ngày</h1>
                    <p className="text-lg text-slate-600 max-w-lg leading-relaxed">
                        Nền tảng học tập thông minh giúp học sinh nắm vững kiến thức, rèn luyện kỹ năng và chinh phục mọi kỳ thi
                        với kho đề thi đa dạng.
                    </p>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('home')} className="bg-sage text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg transition">Bắt
                            đầu ngay</button>
                    </div>
                </div>
                <div className="relative">
                    <div className="bg-white p-4 rounded-[40px] shadow-2xl relative z-10 overflow-hidden">
                        {/* Using a representative placeholder for the student & Corgi visual */}
                        <img src="https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=800"
                            alt="Student studying" className="rounded-[32px] w-full aspect-[4/3] object-cover" />
                        {/* Virtual Pet Overlay Badge (Concept) */}
                        <div
                            className="absolute bottom-8 right-8 bg-white/90 backdrop-blur p-4 rounded-2xl shadow-xl border border-white flex items-center gap-3">
                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-2xl">🐕</div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thú cưng ảo</p>
                                <p className="font-bold text-slate-800">Corgi lv.5</p>
                            </div>
                        </div>
                    </div>
                    {/* Decorative blobs */}
                    <div className="absolute -top-10 -right-10 w-64 h-64 bg-emerald-100 rounded-full blur-3xl opacity-50 -z-10">
                    </div>
                    <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-amber-100 rounded-full blur-3xl opacity-50 -z-10">
                    </div>
                </div>
            </section>

            {/* Trust & Quality Section (Navy) */}
            <section className="bg-navy py-20">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-4xl text-white serif-font">Tại sao hàng ngàn Phụ huynh tin chọn?</h2>
                        <p className="text-blue-100/70 max-w-2xl mx-auto">Cam kết chất lượng và môi trường học tập an toàn nhất cho
                            con trẻ.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Card 1 */}
                        <div className="bg-white p-8 rounded-2xl shadow-xl hover:-translate-y-2 transition duration-300">
                            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-3xl mb-6">📚</div>
                            <h3 className="text-2xl mb-3 text-slate-900 serif-font">Nội dung chuẩn hóa</h3>
                            <p className="text-slate-600">Hệ thống bài giảng và bài tập được xây dựng theo chương trình giáo dục mới
                                nhất.</p>
                        </div>
                        {/* Card 2 */}
                        <div className="bg-white p-8 rounded-2xl shadow-xl hover:-translate-y-2 transition duration-300">
                            <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center text-3xl mb-6">📈
                            </div>
                            <h3 className="text-2xl mb-3 text-slate-900 serif-font">Báo cáo tức thì</h3>
                            <p className="text-slate-600">Phụ huynh theo dõi tiến độ và kết quả học tập của con theo thời gian thực.
                            </p>
                        </div>
                        {/* Card 3 */}
                        <div className="bg-white p-8 rounded-2xl shadow-xl hover:-translate-y-2 transition duration-300">
                            <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center text-3xl mb-6">🛡️
                            </div>
                            <h3 className="text-2xl mb-3 text-slate-900 serif-font">Môi trường An toàn</h3>
                            <p className="text-slate-600">Đảm bảo 100% không quảng cáo và nội dung không phù hợp với trẻ em.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features List */}
            <section className="max-w-5xl mx-auto px-6 py-24">
                <div className="text-center mb-16">
                    <h2 className="text-4xl mb-4 serif-font">Tính năng nổi bật</h2>
                    <p className="text-slate-500">Khám phá các công cụ hỗ trợ tập luyện điện tử hiện nay</p>
                </div>
                <div className="grid md:grid-cols-2 gap-x-16 gap-y-12">
                    <div className="flex gap-6">
                        <div
                            className="w-12 h-12 bg-emerald-50 rounded-xl flex-shrink-0 flex items-center justify-center text-sage text-2xl">
                            📖</div>
                        <div>
                            <h4 className="font-bold text-lg mb-2">Ôn bài theo chủ đề</h4>
                            <p className="text-slate-500 text-sm leading-relaxed">Hệ thống bài tập phân loại theo từng chương, từng
                                môn học giúp dễ dàng ôn luyện.</p>
                        </div>
                    </div>
                    <div className="flex gap-6">
                        <div
                            className="w-12 h-12 bg-emerald-50 rounded-xl flex-shrink-0 flex items-center justify-center text-sage text-2xl">
                            📝</div>
                        <div>
                            <h4 className="font-bold text-lg mb-2">Luyện tập qua câu hỏi</h4>
                            <p className="text-slate-500 text-sm leading-relaxed">Hàng ngàn câu hỏi trắc nghiệm tương tác giúp học
                                sinh ghi nhớ kiến thức lâu hơn.</p>
                        </div>
                    </div>
                    <div className="flex gap-6">
                        <div
                            className="w-12 h-12 bg-emerald-50 rounded-xl flex-shrink-0 flex items-center justify-center text-sage text-2xl">
                            🇬🇧</div>
                        <div>
                            <h4 className="font-bold text-lg mb-2">Kết hợp tiếng Anh</h4>
                            <p className="text-slate-500 text-sm leading-relaxed">Vừa học kiến thức vừa cải thiện vốn từ vựng tiếng
                                Anh chuyên ngành một cách tự nhiên.</p>
                        </div>
                    </div>
                    <div className="flex gap-6">
                        <div
                            className="w-12 h-12 bg-emerald-50 rounded-xl flex-shrink-0 flex items-center justify-center text-sage text-2xl">
                            📊</div>
                        <div>
                            <h4 className="font-bold text-lg mb-2">Xem kết quả ngay</h4>
                            <p className="text-slate-500 text-sm leading-relaxed">Phản hồi kết quả và giải thích chi tiết ngay sau
                                khi hoàn thành mỗi bài tập.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Gamification Section (Pale Yellow) */}
            <section className="bg-[#FEF3C7] py-24">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <h2 className="text-4xl mb-16 serif-font">Học vui để nhận phần thưởng!</h2>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-12">
                        {/* Leaderboard circles */}
                        <div className="flex -space-x-12">
                            <div
                                className="w-48 h-48 bg-white rounded-full flex flex-col items-center justify-center shadow-lg border-8 border-sage relative z-20">
                                <span className="text-sm font-bold text-sage">Hạng 1</span>
                                <p className="text-xl font-bold">Nam Nguyễn</p>
                                <p className="text-slate-400 text-sm">1,250 XP</p>
                            </div>
                            <div
                                className="w-48 h-48 bg-white/60 backdrop-blur rounded-full flex flex-col items-center justify-center shadow-md border-8 border-white/50 translate-y-8">
                                <span className="text-sm font-bold text-slate-400">Hạng 2</span>
                                <p className="text-xl font-bold">Lan Anh</p>
                                <p className="text-slate-400 text-sm">1,100 XP</p>
                            </div>
                        </div>
                        <div className="max-w-md text-left space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-amber-400">
                                <p className="font-bold text-lg">✨ Cửa hàng thú cưng</p>
                                <p className="text-slate-600 text-sm">Dùng điểm thưởng đổi lấy trang phục và phụ kiện cực "cool" cho
                                    thú cưng của bạn.</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-emerald-400">
                                <p className="font-bold text-lg">🏆 Đua Top tuần</p>
                                <p className="text-slate-600 text-sm">Cạnh tranh lành mạnh cùng bạn bè để nhận được những huy hiệu
                                    danh giá nhất.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Statistics */}
            <section className="max-w-7xl mx-auto px-6 py-20 border-y border-slate-100">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div>
                        <p className="text-4xl font-bold text-sage mb-2 serif-font">2,000+</p>
                        <p className="text-slate-500 text-sm font-medium">BÀI LUYỆN TẬP</p>
                    </div>
                    <div>
                        <p className="text-4xl font-bold text-sage mb-2 serif-font">20,000+</p>
                        <p className="text-slate-500 text-sm font-medium">CÂU HỎI ĐỀ THI</p>
                    </div>
                    <div>
                        <p className="text-4xl font-bold text-sage mb-2 serif-font">15,000+</p>
                        <p className="text-slate-500 text-sm font-medium">HỌC SINH ĐĂNG KÝ</p>
                    </div>
                    <div>
                        <p className="text-4xl font-bold text-sage mb-2 serif-font">98%</p>
                        <p className="text-slate-500 text-sm font-medium">HÀI LÒNG</p>
                    </div>
                </div>
            </section>

            {/* Call to Action (Gradient) */}
            <section className="max-w-7xl mx-auto px-6 py-12">
                <div
                    className="bg-gradient-to-r from-[#10B981] via-[#34D399] to-[#FCD34D] rounded-[40px] p-12 md:p-20 text-center text-white relative overflow-hidden">
                    <div className="relative z-10 space-y-8">
                        <h2 className="text-4xl md:text-5xl leading-tight serif-font">Bắt đầu luyện tập ngay hôm nay!</h2>
                        <p className="text-lg opacity-90">Gia nhập cộng đồng hơn 15,000 học sinh đang tiến bộ mỗi ngày cùng
                            iTongQuiz.</p>
                        <button
                            onClick={() => setView('home')}
                            className="bg-white text-emerald-600 px-10 py-5 rounded-full font-bold text-xl hover:scale-105 transition shadow-2xl">Đăng
                            ký miễn phí</button>
                    </div>
                    {/* Abstract background shape */}
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-white/10 -skew-x-12"></div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white pt-20 pb-10 border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-16">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-sage rounded-lg flex items-center justify-center text-white font-bold">iT
                            </div>
                            <span className="text-xl font-bold tracking-tight">
                                <span style={{ color: '#1e3a8a' }}>ítong</span><span style={{ color: '#FACC15' }}>Quiz</span>
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed">Nền tảng giúp học sinh nắm vững kiến thức thông qua
                            học tập tương tác và trò chơi hóa hấp dẫn.</p>
                        <div className="flex gap-4">
                            <a href="#"
                                className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-sage transition">FB</a>
                            <a href="#"
                                className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-sage transition">IG</a>
                            <a href="#"
                                className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-sage transition">YT</a>
                        </div>
                    </div>
                    <div>
                        <h5 className="font-bold mb-6">Liên kết</h5>
                        <ul className="space-y-4 text-sm text-slate-500">
                            <li><a href="#" className="hover:text-sage transition">Trang chủ</a></li>
                            <li><a href="#" className="hover:text-sage transition">Về chúng tôi</a></li>
                            <li><a href="#" className="hover:text-sage transition">Đội ngũ</a></li>
                            <li><a href="#" className="hover:text-sage transition">Tin tức</a></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-bold mb-6">Hỗ trợ</h5>
                        <ul className="space-y-4 text-sm text-slate-500">
                            <li><a href="#" className="hover:text-sage transition">Trung tâm trợ giúp</a></li>
                            <li><a href="#" className="hover:text-sage transition">Hướng dẫn sử dụng</a></li>
                            <li><a href="#" className="hover:text-sage transition">Chính sách bảo mật</a></li>
                            <li><a href="#" className="hover:text-sage transition">Điều khoản dịch vụ</a></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-bold mb-6">Liên hệ</h5>
                        <ul className="space-y-4 text-sm text-slate-500">
                            <li className="flex items-center gap-3">📧 admin@thitong.io.vn</li>
                            <li className="flex items-center gap-3">📞 0326439774</li>
                            <li className="flex items-center gap-3">📍 Mường La, Sơn La</li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 pt-10 border-t border-slate-50 text-center text-xs text-slate-400">
                    © 2024 iTongQuiz Platform. Tất cả các quyền được bảo lưu.
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
