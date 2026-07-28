import React, { FormEvent, useState } from 'react';
import {
    ArrowRight,
    ChevronDown,
    Clock3,
    Globe2,
    GraduationCap,
    Handshake,
    Headphones,
    Info,
    Mail,
    MapPin,
    MonitorSmartphone,
    Send,
    UserRound,
} from 'lucide-react';
import PublicSiteHeader from './PublicSiteHeader';

const supportTopics = [
    {
        icon: UserRound,
        title: 'Tài khoản & đăng nhập',
        description: 'Mật khẩu, mã học sinh, thông tin tài khoản',
        value: 'Tài khoản & đăng nhập',
        color: 'bg-blue-50 text-blue-700',
    },
    {
        icon: GraduationCap,
        title: 'Sử dụng nền tảng',
        description: 'Làm bài, giao bài, quản lý lớp học',
        value: 'Sử dụng nền tảng',
        color: 'bg-amber-50 text-amber-700',
    },
    {
        icon: Handshake,
        title: 'Hợp tác cùng nhà trường',
        description: 'Kết nối giáo viên, phụ huynh và tổ chức',
        value: 'Hợp tác cùng nhà trường',
        color: 'bg-emerald-50 text-emerald-700',
    },
];

const quickContacts = [
    {
        icon: Mail,
        title: 'Email hỗ trợ',
        value: 'support@thitong.site',
        detail: 'Phản hồi trong giờ làm việc',
        href: 'mailto:support@thitong.site',
        color: 'bg-blue-100 text-blue-700',
    },
    {
        icon: Globe2,
        title: 'Website',
        value: 'www.thitong.site',
        detail: 'Cổng học tập chính thức',
        href: 'https://www.thitong.site',
        color: 'bg-amber-100 text-amber-700',
    },
    {
        icon: MapPin,
        title: 'Nhà trường',
        value: 'Mường La, Sơn La',
        detail: 'Trường Tiểu học Ít Ong',
        href: 'https://www.google.com/maps?q=Muong+La+Son+La',
        color: 'bg-emerald-100 text-emerald-700',
    },
];

const ContactPage: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [formStatus, setFormStatus] = useState('');

    const chooseTopic = (value: string) => {
        setTopic(value);
        const form = document.getElementById('support-form');
        if (form && typeof form.scrollIntoView === 'function') {
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const subject = String(data.get('subject') || 'Yêu cầu hỗ trợ iTongQuiz');
        const body = [
            `Họ và tên: ${String(data.get('fullName') || '')}`,
            `Số điện thoại: ${String(data.get('phone') || '')}`,
            `Email: ${String(data.get('email') || '')}`,
            `Chủ đề: ${subject}`,
            '',
            String(data.get('message') || ''),
        ].join('\n');

        setFormStatus('Đang mở ứng dụng email để bạn kiểm tra và gửi yêu cầu.');
        window.open(
            `mailto:support@thitong.site?subject=${encodeURIComponent(`[iTongQuiz] ${subject}`)}&body=${encodeURIComponent(body)}`,
            '_self'
        );
    };

    return (
        <div className="min-h-screen bg-[#f7f9ff] font-['Be_Vietnam_Pro'] text-slate-900">
            <PublicSiteHeader active="contact" />

            <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <section className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700">
                            <Headphones className="h-4 w-4" aria-hidden="true" />
                            Luôn sẵn sàng hỗ trợ
                        </div>
                        <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
                            Kết nối với <span className="text-blue-700">iTongQuiz</span>
                        </h1>
                        <p className="mt-5 max-w-xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
                            Hãy cho chúng tôi biết bạn cần hỗ trợ điều gì. Thông tin càng rõ ràng, giáo viên và bộ phận quản trị càng có thể phản hồi nhanh hơn.
                        </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_22px_60px_rgba(30,64,175,0.10)] sm:p-7">
                        <h2 className="text-lg font-black text-slate-950">Bạn cần hỗ trợ về?</h2>
                        <div className="mt-5 space-y-3">
                            {supportTopics.map(({ icon: Icon, title, description, value, color }) => (
                                <button
                                    type="button"
                                    key={value}
                                    onClick={() => chooseTopic(value)}
                                    className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left transition hover:border-blue-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                                >
                                    <span className="flex min-w-0 items-center gap-4">
                                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${color}`}>
                                            <Icon className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block font-bold text-slate-900">{title}</span>
                                            <span className="mt-0.5 block text-xs font-medium text-slate-500 sm:text-sm">{description}</span>
                                        </span>
                                    </span>
                                    <ArrowRight className="ml-3 h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700" aria-hidden="true" />
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mt-14 grid gap-5 md:grid-cols-3" aria-label="Kênh liên hệ nhanh">
                    {quickContacts.map(({ icon: Icon, title, value, detail, href, color }) => (
                        <a
                            key={title}
                            href={href}
                            target={href.startsWith('http') ? '_blank' : undefined}
                            rel={href.startsWith('http') ? 'noreferrer' : undefined}
                            className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        >
                            <span className={`flex h-14 w-14 items-center justify-center rounded-full ${color}`}>
                                <Icon className="h-6 w-6" aria-hidden="true" />
                            </span>
                            <h2 className="mt-4 font-black text-slate-950">{title}</h2>
                            <p className="mt-2 break-all text-sm font-bold text-blue-700">{value}</p>
                            <p className="mt-1 text-xs font-medium text-slate-500">{detail}</p>
                        </a>
                    ))}
                </section>

                <section className="mt-16 grid gap-8 lg:grid-cols-12 lg:gap-10">
                    <div id="support-form" className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-7 lg:p-10">
                        <h2 className="text-2xl font-black text-slate-950">Gửi yêu cầu hỗ trợ</h2>
                        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">Điền thông tin bên dưới; hệ thống sẽ tạo sẵn email để bạn kiểm tra trước khi gửi.</p>

                        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="contact-full-name" className="mb-2 block text-sm font-bold text-slate-700">Họ và tên *</label>
                                    <input id="contact-full-name" name="fullName" required autoComplete="name" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="Nhập họ và tên" />
                                </div>
                                <div>
                                    <label htmlFor="contact-phone" className="mb-2 block text-sm font-bold text-slate-700">Số điện thoại *</label>
                                    <input id="contact-phone" name="phone" required type="tel" autoComplete="tel" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="Nhập số điện thoại" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="contact-email" className="mb-2 block text-sm font-bold text-slate-700">Email *</label>
                                <input id="contact-email" name="email" required type="email" autoComplete="email" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="vidu@email.com" />
                            </div>
                            <div>
                                <label htmlFor="contact-subject" className="mb-2 block text-sm font-bold text-slate-700">Chủ đề hỗ trợ *</label>
                                <div className="relative">
                                    <select id="contact-subject" name="subject" required value={topic} onChange={(event) => setTopic(event.target.value)} className="w-full appearance-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 pr-10 text-sm outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100">
                                        <option value="">Chọn chủ đề...</option>
                                        {supportTopics.map((item) => <option key={item.value} value={item.value}>{item.value}</option>)}
                                        <option value="Báo lỗi kỹ thuật">Báo lỗi kỹ thuật</option>
                                        <option value="Nội dung khác">Nội dung khác</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="contact-message" className="mb-2 block text-sm font-bold text-slate-700">Nội dung chi tiết *</label>
                                <textarea id="contact-message" name="message" required rows={5} className="w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="Mô tả vấn đề và các bước đã thực hiện..." />
                            </div>
                            <label className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-600">
                                <input type="checkbox" required className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600" />
                                <span>Tôi đồng ý cung cấp thông tin này để nhà trường hỗ trợ và sẽ không nhập mật khẩu vào nội dung liên hệ.</span>
                            </label>
                            <button type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                                Gửi yêu cầu
                                <Send className="h-4 w-4" aria-hidden="true" />
                            </button>
                            {formStatus && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{formStatus}</p>}
                        </form>
                    </div>

                    <aside className="space-y-6 lg:col-span-5">
                        <div className="rounded-3xl border border-blue-100 bg-blue-50 p-7">
                            <h2 className="flex items-center gap-3 text-lg font-black text-slate-950">
                                <Info className="h-5 w-5 text-blue-700" aria-hidden="true" />
                                Thông tin hỗ trợ
                            </h2>
                            <div className="mt-6 space-y-5">
                                <div className="flex gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-blue-700"><Clock3 className="h-5 w-5" /></span>
                                    <div><h3 className="text-sm font-black">Thời gian phản hồi</h3><p className="mt-1 text-sm font-medium leading-6 text-slate-600">Yêu cầu qua email được xử lý trong giờ làm việc của nhà trường.</p></div>
                                </div>
                                <div className="flex gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-amber-700"><MonitorSmartphone className="h-5 w-5" /></span>
                                    <div><h3 className="text-sm font-black">Khi báo lỗi kỹ thuật</h3><p className="mt-1 text-sm font-medium leading-6 text-slate-600">Hãy ghi rõ loại tài khoản, thiết bị, trình duyệt và đính kèm ảnh lỗi nếu có.</p></div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                            <h2 className="text-lg font-black text-slate-950">Câu hỏi thường gặp</h2>
                            <div className="mt-5 space-y-3">
                                {[
                                    ['Học sinh quên mật khẩu thì làm gì?', 'Học sinh cần nhờ giáo viên chủ nhiệm cấp lại mật khẩu. Không chia sẻ mật khẩu qua phần nội dung liên hệ.'],
                                    ['Nền tảng dùng được trên điện thoại không?', 'Có. iTongQuiz được tối ưu cho máy tính, máy tính bảng và điện thoại thông minh.'],
                                    ['Giáo viên cần hỗ trợ tài khoản?', 'Chọn mục Tài khoản & đăng nhập, mô tả tên đơn vị và vấn đề đang gặp để quản trị viên kiểm tra.'],
                                ].map(([question, answer]) => (
                                    <details key={question} className="group rounded-2xl border border-slate-200 bg-slate-50 open:border-blue-200 open:bg-white">
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-bold text-slate-800">
                                            {question}
                                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden="true" />
                                        </summary>
                                        <p className="px-4 pb-4 text-sm font-medium leading-6 text-slate-600">{answer}</p>
                                    </details>
                                ))}
                            </div>
                        </div>
                    </aside>
                </section>

                <section className="relative mt-16 overflow-hidden rounded-[2rem] bg-blue-800 p-8 text-white shadow-xl sm:p-10 lg:flex lg:items-center lg:justify-between lg:p-12">
                    <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-amber-300/30 blur-3xl" />
                    <div className="relative max-w-2xl">
                        <h2 className="text-2xl font-black sm:text-3xl">Cần hỗ trợ nhanh?</h2>
                        <p className="mt-3 font-medium leading-7 text-blue-100">Gửi email trực tiếp và mô tả rõ vấn đề để quản trị viên có thể hỗ trợ chính xác.</p>
                    </div>
                    <a href="mailto:support@thitong.site" className="relative mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-400 px-7 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white lg:mt-0">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Gửi email ngay
                    </a>
                </section>
            </main>
        </div>
    );
};

export default ContactPage;
