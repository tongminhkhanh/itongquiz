import React from 'react';
import {
    ArrowRight,
    BarChart3,
    BookOpenCheck,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    Eye,
    FileText,
    GraduationCap,
    Lightbulb,
    ListChecks,
    Sparkles,
    UsersRound,
} from 'lucide-react';
import { PublicPageLayout } from '../../app/PublicPageLayout';
import type { RoutePath } from '../../app/routeTypes';
import PublicSiteHeader from './PublicSiteHeader';

export type TeacherGuideId = 'create-quiz' | 'assign-work' | 'review-results';

export const TEACHER_GUIDE_PATHS: Record<TeacherGuideId, RoutePath> = {
    'create-quiz': '/huong-dan-tao-de-kiem-tra-tieu-hoc',
    'assign-work': '/huong-dan-giao-bai-truc-tuyen',
    'review-results': '/huong-dan-xem-ket-qua-hoc-tap',
};

type GuideIcon = typeof FileText;

interface GuideStep {
    title: string;
    description: string;
}

interface GuideContent {
    eyebrow: string;
    title: string;
    lead: string;
    icon: GuideIcon;
    preparation: Array<{ label: string; value: string; icon: GuideIcon }>;
    steps: GuideStep[];
    tips: string[];
    faqs: Array<{ question: string; answer: string }>;
    note?: string;
    next: { label: string; guide: TeacherGuideId };
}

const guideContent: Record<TeacherGuideId, GuideContent> = {
    'create-quiz': {
        eyebrow: 'Hướng dẫn dành cho giáo viên',
        title: 'Tạo đề kiểm tra tiểu học',
        lead: 'Chuẩn bị một đề rõ mục tiêu, vừa sức và sẵn sàng giao cho lớp chỉ với các bước quen thuộc trên iTongQuiz.',
        icon: FileText,
        preparation: [
            { label: 'Mục tiêu', value: 'Kiến thức cần kiểm tra', icon: BookOpenCheck },
            { label: 'Lớp và môn', value: 'Đúng nhóm học sinh', icon: UsersRound },
            { label: 'Thời lượng', value: 'Phù hợp số câu hỏi', icon: Clock3 },
        ],
        steps: [
            { title: 'Chọn “Tạo đề mới”', description: 'Từ khu vực quản lý đề, chọn nút Tạo đề mới để bắt đầu một đề kiểm tra.' },
            { title: 'Đặt tên và phạm vi đề', description: 'Ghi tên dễ nhận biết, chọn khối lớp, môn học và nội dung cần ôn tập.' },
            { title: 'Thiết lập cấu trúc câu hỏi', description: 'Xác định số câu, thời gian làm bài và mức độ phù hợp với mục tiêu kiểm tra.' },
            { title: 'Rà soát nội dung', description: 'Đọc lại từng câu, đáp án và cách trình bày trước khi lưu đề.' },
            { title: 'Lưu để sẵn sàng giao bài', description: 'Sau khi lưu, đề nằm trong danh sách quản lý để giáo viên có thể giao cho lớp.' },
        ],
        tips: [
            'Đặt tên đề theo bài học hoặc tuần để dễ tìm lại.',
            'Cân bằng câu nhận biết và câu vận dụng phù hợp với học sinh tiểu học.',
            'Luôn xem trước đề để phát hiện lỗi chính tả, dữ liệu hoặc thời gian làm bài.',
        ],
        faqs: [
            { question: 'Có thể chỉnh sửa đề trước khi giao không?', answer: 'Có. Giáo viên có thể mở lại đề trong phần Quản lý đề để kiểm tra và điều chỉnh trước khi giao bài.' },
            { question: 'Làm thế nào để kiểm tra lại nội dung đề?', answer: 'Hãy dùng thao tác xem trước, đọc lại từng câu hỏi và đối chiếu đáp án trước khi lưu hoặc giao bài.' },
        ],
        next: { label: 'Tiếp theo: giao bài cho học sinh', guide: 'assign-work' },
    },
    'assign-work': {
        eyebrow: 'Hướng dẫn dành cho giáo viên',
        title: 'Giao bài trực tuyến cho học sinh',
        lead: 'Chọn đúng lớp, đặt thời gian hợp lý và theo dõi việc hoàn thành để học sinh có một nhiệm vụ rõ ràng mỗi ngày.',
        icon: ClipboardCheck,
        preparation: [
            { label: 'Lớp học', value: 'Danh sách học sinh nhận bài', icon: UsersRound },
            { label: 'Hạn nộp', value: 'Mốc thời gian rõ ràng', icon: Clock3 },
            { label: 'Lượt làm', value: 'Phù hợp mục tiêu bài học', icon: ListChecks },
        ],
        steps: [
            { title: 'Mở đề cần giao', description: 'Trong Quản lý đề, tìm đề đã chuẩn bị rồi chọn nút Giao bài.' },
            { title: 'Chọn lớp nhận bài', description: 'Kiểm tra tên lớp để bảo đảm nhiệm vụ được gửi đúng nhóm học sinh.' },
            { title: 'Thiết lập thời gian và lượt làm', description: 'Đặt hạn nộp, thời gian làm bài và số lượt làm theo yêu cầu của bài học.' },
            { title: 'Xác nhận giao bài', description: 'Rà lại các thiết lập một lần cuối, sau đó xác nhận để bài xuất hiện trong phần bài được giao của học sinh.' },
        ],
        tips: [
            'Ghi mục tiêu ngắn gọn trong tên đề để học sinh hiểu ngay việc cần làm.',
            'Chọn hạn nộp đủ thời gian để các em chủ động hoàn thành bài.',
            'Nhắc học sinh kiểm tra kết nối mạng trước khi bắt đầu làm bài.',
        ],
        faqs: [
            { question: 'Học sinh có thể làm lại bài không?', answer: 'Điều này phụ thuộc vào số lượt làm mà giáo viên đã thiết lập khi giao bài.' },
            { question: 'Có thể giao cùng một đề cho nhiều lớp không?', answer: 'Có. Giáo viên có thể thực hiện giao bài theo từng lớp và thiết lập phù hợp cho mỗi lớp.' },
        ],
        next: { label: 'Tiếp theo: xem kết quả học tập', guide: 'review-results' },
    },
    'review-results': {
        eyebrow: 'Hướng dẫn dành cho giáo viên',
        title: 'Xem và phân tích kết quả học tập',
        lead: 'Từ tiến độ của cả lớp đến từng câu trả lời, kết quả giúp giáo viên nhận ra nội dung cần củng cố và hỗ trợ đúng lúc.',
        icon: BarChart3,
        preparation: [
            { label: 'Hoàn thành', value: 'Ai đã nộp bài', icon: CheckCircle2 },
            { label: 'Điểm số', value: 'Bức tranh chung của lớp', icon: BarChart3 },
            { label: 'Câu cần xem lại', value: 'Nội dung cần củng cố', icon: Eye },
        ],
        steps: [
            { title: 'Theo dõi tiến độ lớp', description: 'Mở phần Kết quả học tập để xem học sinh nào đã hoàn thành và học sinh nào cần được nhắc.' },
            { title: 'Xem kết quả từng học sinh', description: 'Chọn một học sinh để xem bài đã làm, lựa chọn đã chọn, đúng/sai và đáp án sau khi nộp.' },
            { title: 'Nhận diện nội dung cần củng cố', description: 'So sánh các câu học sinh thường làm sai để chuẩn bị hoạt động ôn tập hoặc hỗ trợ phù hợp.' },
        ],
        tips: [
            'Dùng kết quả để lên kế hoạch ôn tập ngắn cho cả lớp.',
            'Chuẩn bị câu hỏi nâng cao cho học sinh đã nắm vững kiến thức.',
            'Trao đổi riêng, khích lệ học sinh còn gặp khó khăn thay vì chỉ nhìn vào điểm số.',
        ],
        faqs: [
            { question: 'Học sinh xem lại bài sau khi nộp như thế nào?', answer: 'Sau khi nộp, học sinh có thể xem lại toàn bộ câu hỏi, câu trả lời của mình, trạng thái đúng/sai và đáp án để rút kinh nghiệm.' },
            { question: 'Nên bắt đầu phân tích từ đâu?', answer: 'Hãy bắt đầu từ tỷ lệ hoàn thành của lớp, sau đó xem các câu có nhiều học sinh trả lời sai để tìm nội dung cần hỗ trợ.' },
        ],
        note: 'Điểm số là tín hiệu để hỗ trợ việc học, không dùng để so sánh học sinh.',
        next: { label: 'Xem lại: tạo đề kiểm tra', guide: 'create-quiz' },
    },
};

interface TeacherGuidePageProps {
    guide: TeacherGuideId;
}

const TeacherGuidePage: React.FC<TeacherGuidePageProps> = ({ guide }) => {
    const content = guideContent[guide];
    const HeroIcon = content.icon;
    const nextPath = TEACHER_GUIDE_PATHS[content.next.guide];

    return (
        <PublicPageLayout onNavigate={() => undefined}>
            <PublicSiteHeader active="guides" />
            <main className="overflow-hidden bg-[#f8fbff] text-slate-800">
                <section className="relative border-b border-blue-100 bg-[radial-gradient(circle_at_top_left,_#dbeafe,_transparent_42%),linear-gradient(135deg,_#f8fbff_0%,_#eef8ff_48%,_#f0fdf4_100%)] py-16 sm:py-20">
                    <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-8">
                        <div>
                            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-800">
                                <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
                                {content.eyebrow}
                            </p>
                            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-[#173b7a] sm:text-5xl">{content.title}</h1>
                            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{content.lead}</p>
                            <a href="#cac-buoc" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#1d4ed8] px-5 py-3 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                                Xem các bước thực hiện <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </a>
                        </div>
                        <div className="rounded-[28px] border border-white bg-white/90 p-6 shadow-xl shadow-blue-100/70 sm:p-8">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><HeroIcon className="h-7 w-7" aria-hidden="true" /></div>
                            <p className="mt-5 text-sm font-bold text-slate-500">Quy trình đơn giản</p>
                            <div className="mt-4 space-y-3">
                                {['Chuẩn bị', 'Thực hiện', 'Theo dõi'].map((item, index) => (
                                    <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#173b7a] text-sm font-black text-white">{index + 1}</span>
                                        <span className="font-bold text-slate-700">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                    <div className="mb-7"><p className="text-sm font-extrabold uppercase tracking-[0.14em] text-emerald-700">Trước khi bắt đầu</p><h2 className="mt-2 text-2xl font-black text-[#173b7a]">Chuẩn bị trong ít phút</h2></div>
                    <div className="grid gap-4 md:grid-cols-3">
                        {content.preparation.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="h-6 w-6 text-emerald-600" aria-hidden="true" /><h3 className="mt-4 font-extrabold text-slate-800">{label}</h3><p className="mt-1 text-sm text-slate-600">{value}</p></article>)}
                    </div>
                </section>

                <section id="cac-buoc" className="bg-white py-16 scroll-mt-20">
                    <div className="mx-auto max-w-4xl px-4 sm:px-6">
                        <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-blue-700">Thực hiện từng bước</p>
                        <h2 className="mt-2 text-3xl font-black text-[#173b7a]">Làm theo {content.steps.length} bước dưới đây</h2>
                        <ol className="mt-9 space-y-5">
                            {content.steps.map((step, index) => <li key={step.title} className="flex gap-4 rounded-2xl border border-slate-200 p-5 shadow-sm"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 font-black text-amber-700">{index + 1}</span><div><h3 className="text-lg font-extrabold text-slate-800">{step.title}</h3><p className="mt-1.5 leading-7 text-slate-600">{step.description}</p></div></li>)}
                        </ol>
                    </div>
                </section>

                <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_.9fr] lg:px-8">
                    <div className="rounded-3xl bg-[#173b7a] p-7 text-white sm:p-8"><Lightbulb className="h-7 w-7 text-amber-300" aria-hidden="true" /><h2 className="mt-4 text-2xl font-black">Mẹo cho giờ học hiệu quả</h2><ul className="mt-5 space-y-4">{content.tips.map((tip) => <li key={tip} className="flex gap-3 text-blue-50"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />{tip}</li>)}</ul></div>
                    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-7 sm:p-8"><h2 className="text-2xl font-black text-[#173b7a]">Câu hỏi thường gặp</h2><div className="mt-4 divide-y divide-amber-200">{content.faqs.map((faq) => <details key={faq.question} className="py-3.5"><summary className="cursor-pointer list-none pr-6 font-bold text-slate-800 marker:hidden">{faq.question}</summary><p className="mt-2 leading-7 text-slate-600">{faq.answer}</p></details>)}</div></div>
                </section>

                {content.note && <aside className="mx-auto mb-16 max-w-5xl rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center font-bold text-emerald-800">{content.note}</aside>}
                <section className="bg-gradient-to-r from-blue-700 to-[#173b7a] py-14 text-center text-white"><div className="mx-auto max-w-2xl px-4"><GraduationCap className="mx-auto h-8 w-8 text-amber-300" aria-hidden="true" /><h2 className="mt-4 text-2xl font-black">Sẵn sàng tiếp tục?</h2><p className="mt-2 text-blue-100">Khám phá bước tiếp theo trong quy trình dạy học với iTongQuiz.</p><a href={nextPath} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-extrabold text-blue-800 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-800">{content.next.label}<ArrowRight className="h-4 w-4" aria-hidden="true" /></a></div></section>
            </main>
        </PublicPageLayout>
    );
};

export default TeacherGuidePage;
