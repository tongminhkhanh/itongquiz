import React from 'react';

export const NotFoundPage: React.FC = () => (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16 text-center">
        <section className="max-w-lg rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Lỗi 404</p>
            <h1 className="mt-3 text-3xl font-extrabold text-slate-900">Không tìm thấy trang này</h1>
            <p className="mt-3 text-slate-600">Đường dẫn có thể đã thay đổi hoặc không còn tồn tại.</p>
            <a
                href="/"
                className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 font-bold text-white transition hover:bg-primary/90"
            >
                Về trang chủ
            </a>
        </section>
    </main>
);
