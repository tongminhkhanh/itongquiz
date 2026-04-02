import React, { FormEvent, useState } from 'react';
import { ExternalLink, Facebook, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ContactPage: React.FC = () => {
    const navigate = useNavigate();
    const [formStatus, setFormStatus] = useState('');

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormStatus('Cảm ơn bạn! Tính năng gửi liên hệ sẽ được cập nhật ở phiên bản tiếp theo.');
    };

    return (
        <div className="min-h-screen bg-[linear-gradient(180deg,#f0f9ff_0%,#ffffff_30%,#f8fafc_100%)] text-slate-800">
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
                            className="px-4 py-2 rounded-full text-sm font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                            Giới thiệu
                        </button>
                        <button
                            onClick={() => navigate('/contact')}
                            className="px-4 py-2 rounded-full text-sm font-semibold text-blue-700 bg-blue-100"
                        >
                            Liên hệ
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14 space-y-8">
                <section className="rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white p-8 md:p-10 shadow-2xl">
                    <h1 className="text-3xl md:text-4xl font-black mb-3">Kết nối với Trường Tiểu học Ít Ong</h1>
                    <p className="text-blue-100 max-w-3xl">
                        Nhà trường luôn sẵn sàng tiếp nhận thông tin từ phụ huynh và học sinh.
                        Bạn có thể gọi hotline, nhắn tin Zalo hoặc kết nối qua fanpage.
                    </p>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <MapPin className="w-5 h-5 text-blue-600" />
                            <h2 className="text-xl font-black">Bản đồ trường</h2>
                        </div>
                        <div className="rounded-2xl overflow-hidden border border-slate-200">
                            <iframe
                                title="Bản đồ Mường La Sơn La"
                                className="w-full h-[360px]"
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                src="https://www.google.com/maps?q=Muong+La+Son+La&output=embed"
                            />
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
                        <h2 className="text-xl font-black mb-3">Kênh liên hệ nhanh</h2>
                        <a
                            href="tel:02123888888"
                            className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 font-semibold transition"
                        >
                            <span className="inline-flex items-center gap-2"><Phone className="w-4 h-4" /> Hotline</span>
                            <ExternalLink className="w-4 h-4" />
                        </a>
                        <a
                            href="https://zalo.me"
                            target="_blank"
                            rel="noreferrer"
                            className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-100 text-cyan-700 font-semibold transition"
                        >
                            <span className="inline-flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Zalo nhóm</span>
                            <ExternalLink className="w-4 h-4" />
                        </a>
                        <a
                            href="https://facebook.com"
                            target="_blank"
                            rel="noreferrer"
                            className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 font-semibold transition"
                        >
                            <span className="inline-flex items-center gap-2"><Facebook className="w-4 h-4" /> Fanpage</span>
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                        <Mail className="w-5 h-5 text-blue-600" />
                        <h2 className="text-xl font-black">Form liên hệ</h2>
                    </div>

                    <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            required
                            placeholder="Họ và tên"
                            className="h-11 px-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                        />
                        <input
                            type="tel"
                            required
                            placeholder="Số điện thoại"
                            className="h-11 px-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                        />
                        <input
                            type="email"
                            required
                            placeholder="Email"
                            className="md:col-span-2 h-11 px-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                        />
                        <textarea
                            required
                            rows={4}
                            placeholder="Nội dung cần liên hệ"
                            className="md:col-span-2 p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-y"
                        />

                        <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-3">
                            <button
                                type="submit"
                                className="px-6 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition"
                            >
                                Gửi liên hệ
                            </button>
                            {formStatus && <p className="text-sm font-medium text-emerald-600">{formStatus}</p>}
                        </div>
                    </form>
                </section>
            </main>
        </div>
    );
};

export default ContactPage;
