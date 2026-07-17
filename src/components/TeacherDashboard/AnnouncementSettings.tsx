import React, { useEffect, useState } from 'react';
import { Archive, Eye, Loader2, Megaphone, Plus, RefreshCw, Save, Send, XCircle } from 'lucide-react';
import { callApi } from '../../services/apiAdapter';
import { getSystemSettings, saveSystemSettings } from '../../services/systemSettingsService';
import { useAuthStore } from '../../../stores/authStore';
import { showError, showSuccess } from '../../utils/toast';

type Status = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'EXPIRED' | 'ARCHIVED';
type Audience = 'ALL' | 'TEACHERS' | 'STUDENTS';
interface AnnouncementItem {
    id: string; content: string; bannerTitle: string; bannerSubtitle: string; bannerLink: string;
    bannerImage: string; isActive: boolean; isBannerActive: boolean; status: Status;
    effectiveStatus: Status; audience: Audience; startsAt: string | null; endsAt: string | null; updatedAt: string;
}

const emptyForm = {
    id: '', content: '', bannerTitle: '', bannerSubtitle: '', bannerLink: '', bannerImage: '',
    isActive: false, isBannerActive: false, status: 'DRAFT' as Status, audience: 'ALL' as Audience,
    startsAt: '', endsAt: '', updatedAt: '',
};

const toLocalInput = (iso: string | null | undefined) => {
    if (!iso) return '';
    const date = new Date(iso);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
};

const AnnouncementSettings: React.FC = () => {
    const auth = useAuthStore();
    const [items, setItems] = useState<AnnouncementItem[]>([]);
    const [form, setForm] = useState(emptyForm);
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
    const [announcementError, setAnnouncementError] = useState('');
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [settingsDegraded, setSettingsDegraded] = useState(false);
    const [settingsError, setSettingsError] = useState('');
    const [aiEnabled, setAiEnabled] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

    const selectItem = (item: AnnouncementItem) => setForm({
        id: item.id, content: item.content || '', bannerTitle: item.bannerTitle || '', bannerSubtitle: item.bannerSubtitle || '',
        bannerLink: item.bannerLink || '', bannerImage: item.bannerImage || '', isActive: Boolean(item.isActive),
        isBannerActive: Boolean(item.isBannerActive), status: item.status, audience: item.audience || 'ALL',
        startsAt: toLocalInput(item.startsAt), endsAt: toLocalInput(item.endsAt), updatedAt: item.updatedAt || '',
    });

    const loadAnnouncements = async () => {
        setLoadingAnnouncements(true); setAnnouncementError('');
        try {
            const response = await callApi<{ data: AnnouncementItem[] }>('list_announcements');
            const rows = response.data || [];
            setItems(rows);
            if (form.id) {
                const current = rows.find((item) => item.id === form.id);
                if (current) selectItem(current);
            } else if (rows[0]) selectItem(rows[0]);
        } catch (err) {
            setAnnouncementError(err instanceof Error ? err.message : 'Không thể tải thông báo.');
        } finally { setLoadingAnnouncements(false); }
    };

    const loadSettings = async () => {
        setSettingsError(''); setSettingsLoaded(false);
        try {
            const data = await getSystemSettings();
            setAiEnabled(data.aiAssistantEnabled);
            setSettingsDegraded(Boolean(data.degraded));
            setSettingsLoaded(!data.degraded);
            if (data.degraded) setSettingsError('Cấu hình tạm không khả dụng; Trợ lý AI đang được tắt an toàn.');
        } catch (err) {
            setAiEnabled(false); setSettingsDegraded(true);
            setSettingsError(err instanceof Error ? err.message : 'Cấu hình tạm không khả dụng.');
        }
    };

    useEffect(() => {
        void Promise.allSettled([loadAnnouncements(), loadSettings()]);
    }, []);

    const payload = () => ({
        content: form.content, bannerTitle: form.bannerTitle, bannerSubtitle: form.bannerSubtitle,
        bannerLink: form.bannerLink, bannerImage: form.bannerImage, isActive: form.isActive,
        isBannerActive: form.isBannerActive, status: form.status, audience: form.audience,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        expectedUpdatedAt: form.updatedAt || undefined,
    });

    const save = async () => {
        setSaving(true);
        try {
            const action = form.id ? 'update_announcement' : 'create_announcement';
            const response = await callApi<{ data?: { id?: string; updatedAt?: string } }>(action, { id: form.id, ...payload() });
            setForm((value) => ({ ...value, id: response.data?.id || value.id, updatedAt: response.data?.updatedAt || value.updatedAt }));
            showSuccess('Đã lưu thông báo.');
            await loadAnnouncements();
        } catch (err) { showError(err instanceof Error ? err.message : 'Không thể lưu thông báo.'); }
        finally { setSaving(false); }
    };

    const runAction = async (action: 'publish_announcement' | 'cancel_announcement' | 'archive_announcement') => {
        if (!form.id) return showError('Hãy lưu bản nháp trước.');
        setSaving(true);
        try {
            await callApi(action, { id: form.id, expectedUpdatedAt: form.updatedAt });
            showSuccess(action === 'publish_announcement' ? 'Đã công bố thông báo.' : action === 'archive_announcement' ? 'Đã lưu trữ thông báo.' : 'Đã hủy lịch phát.');
            await loadAnnouncements();
        } catch (err) { showError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.'); }
        finally { setSaving(false); }
    };

    const saveSettings = async () => {
        if (!settingsLoaded || settingsDegraded || !auth.username) return;
        setSavingSettings(true);
        try {
            await saveSystemSettings({ actorUsername: auth.username, aiAssistantEnabled: aiEnabled });
            showSuccess('Đã lưu cài đặt hệ thống.');
        } catch (err) { showError(err instanceof Error ? err.message : 'Không thể lưu cài đặt.'); }
        finally { setSavingSettings(false); }
    };

    return <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Thông báo hệ thống</h2>
                <p className="text-sm text-slate-600">Soạn bản nháp, chọn đối tượng và đặt lịch theo giờ Việt Nam.</p>
            </div>
            <button onClick={() => setForm(emptyForm)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700">
                <Plus className="h-4 w-4" />Thông báo mới
            </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <aside className="rounded-2xl border bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between px-2"><span className="font-bold">Danh sách</span><button onClick={() => void loadAnnouncements()} aria-label="Làm mới"><RefreshCw className="h-4 w-4" /></button></div>
                {loadingAnnouncements ? (
                    <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : announcementError ? (
                    <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                        {announcementError}<button onClick={() => void loadAnnouncements()} className="ml-1 font-bold underline">Thử lại</button>
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-5 text-center text-sm text-slate-500">Chưa có thông báo.</div>
                ) : (
                    <div className="space-y-1">
                        {items.map((item) => (
                            <button key={item.id} onClick={() => selectItem(item)} className={`w-full rounded-xl p-3 text-left ${form.id === item.id ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}>
                                <div className="truncate font-semibold">{item.bannerTitle || item.content || 'Không có tiêu đề'}</div>
                                <div className="mt-1 flex justify-between text-xs text-slate-500"><span>{item.effectiveStatus}</span><span>{item.audience}</span></div>
                            </button>
                        ))}
                    </div>
                )}
            </aside>

            <section className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-semibold">Trạng thái<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Status })} className="mt-1 h-10 w-full rounded-xl border px-3"><option value="DRAFT">Bản nháp</option><option value="SCHEDULED">Lên lịch</option><option value="PUBLISHED">Công bố</option></select></label>
                    <label className="text-sm font-semibold">Đối tượng<select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value as Audience })} className="mt-1 h-10 w-full rounded-xl border px-3"><option value="ALL">Toàn hệ thống</option><option value="TEACHERS">Giáo viên</option><option value="STUDENTS">Học sinh</option></select></label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Bắt đầu<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="mt-1 h-10 w-full rounded-xl border px-3" /></label><label className="text-sm font-semibold">Kết thúc<input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className="mt-1 h-10 w-full rounded-xl border px-3" /></label></div>
                <label className="block text-sm font-semibold">Tiêu đề<input maxLength={160} value={form.bannerTitle} onChange={(event) => setForm({ ...form, bannerTitle: event.target.value })} className="mt-1 h-10 w-full rounded-xl border px-3" /></label>
                <label className="block text-sm font-semibold">Mô tả<input maxLength={300} value={form.bannerSubtitle} onChange={(event) => setForm({ ...form, bannerSubtitle: event.target.value })} className="mt-1 h-10 w-full rounded-xl border px-3" /></label>
                <label className="block text-sm font-semibold">Chữ chạy<textarea maxLength={1000} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} className="mt-1 min-h-20 w-full rounded-xl border p-3" /></label>
                <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Liên kết HTTPS hoặc nội bộ<input value={form.bannerLink} onChange={(event) => setForm({ ...form, bannerLink: event.target.value })} className="mt-1 h-10 w-full rounded-xl border px-3" /></label><label className="text-sm font-semibold">Ảnh từ media/R2<input value={form.bannerImage} onChange={(event) => setForm({ ...form, bannerImage: event.target.value })} className="mt-1 h-10 w-full rounded-xl border px-3" /></label></div>
                <div className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.isBannerActive} onChange={(event) => setForm({ ...form, isBannerActive: event.target.checked })} />Hiện banner</label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Hiện chữ chạy</label></div>
                <div className="flex flex-wrap gap-2">
                    <button disabled={saving} onClick={() => void save()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />Lưu</button>
                    {form.id && (
                        <>
                            <button disabled={saving} onClick={() => void runAction('publish_announcement')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 font-semibold text-white"><Send className="h-4 w-4" />Công bố</button>
                            <button disabled={saving} onClick={() => void runAction('cancel_announcement')} className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 font-semibold"><XCircle className="h-4 w-4" />Hủy lịch</button>
                            <button disabled={saving} onClick={() => void runAction('archive_announcement')} className="inline-flex h-10 items-center gap-2 rounded-xl border px-4 font-semibold text-slate-700 hover:bg-slate-50"><Archive className="h-4 w-4" />Lưu trữ</button>
                        </>
                    )}
                </div>
            </section>
        </div>

        <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><Eye className="h-5 w-5 text-blue-600" /><h3 className="font-bold">Xem trước</h3></div><div className="rounded-lg bg-slate-100 p-1"><button onClick={() => setPreviewMode('desktop')} className={`rounded-md px-3 py-1 text-sm ${previewMode === 'desktop' ? 'bg-white shadow' : ''}`}>Desktop</button><button onClick={() => setPreviewMode('mobile')} className={`rounded-md px-3 py-1 text-sm ${previewMode === 'mobile' ? 'bg-white shadow' : ''}`}>Mobile</button></div></div><div className={`mx-auto rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200 ${previewMode === 'mobile' ? 'max-w-sm' : 'max-w-4xl'}`}><div className="flex items-center gap-3"><Megaphone className="h-8 w-8 shrink-0 text-emerald-700" /><div className="min-w-0"><div className="truncate font-bold text-emerald-900">{form.bannerTitle || 'Tiêu đề thông báo'}</div><div className="truncate text-sm text-emerald-700">{form.bannerSubtitle || 'Mô tả ngắn sẽ hiển thị tại đây'}</div></div></div></div></section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Cài đặt Trợ lý AI</h3>{settingsError && <div className="my-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{settingsError} <button onClick={() => void loadSettings()} className="font-bold underline">Thử lại</button></div>}<label className="my-4 flex items-center gap-3"><input type="checkbox" checked={aiEnabled} disabled={!settingsLoaded || settingsDegraded} onChange={(event) => setAiEnabled(event.target.checked)} className="h-5 w-5" /><span className="font-semibold">{aiEnabled ? 'Đang bật' : 'Đang tắt'}</span></label><button onClick={() => void saveSettings()} disabled={!settingsLoaded || settingsDegraded || savingSettings} className="rounded-xl bg-slate-800 px-4 py-2 font-semibold text-white disabled:opacity-40">{savingSettings ? 'Đang lưu…' : 'Lưu cài đặt hệ thống'}</button></section>
    </div>;
};

export default AnnouncementSettings;
