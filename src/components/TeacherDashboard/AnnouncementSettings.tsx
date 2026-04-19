import React, { useEffect, useState } from 'react';
import { getAnnouncement, saveAnnouncement, Announcement } from '../../services/announcementService';
import { getSystemSettings, saveSystemSettings } from '../../services/systemSettingsService';
import { useAuthStore } from '../../../stores/authStore';

/**
 * Admin UI for managing marquee and banner announcements
 */
const AnnouncementSettings: React.FC = () => {
    const authStore = useAuthStore();
    
    // Marquee States (Hệ thống cũ - Chữ chạy)
    const [content, setContent] = useState('');
    const [isActive, setIsActive] = useState(false);
    
    // Banner States (Hệ thống mới - LoginLandingPage)
    const [bannerTitle, setBannerTitle] = useState('');
    const [bannerSubtitle, setBannerSubtitle] = useState('');
    const [bannerLink, setBannerLink] = useState('');
    const [bannerImage, setBannerImage] = useState('');
    const [isBannerActive, setIsBannerActive] = useState(false);
    const [daysToLive, setDaysToLive] = useState(7);
    
    const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingSystem, setIsSavingSystem] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [announcementData, settingsData] = await Promise.all([
                    getAnnouncement(),
                    getSystemSettings(),
                ]);

                if (announcementData) {
                    setContent(announcementData.content || '');
                    setIsActive(announcementData.isActive);
                    
                    setBannerTitle(announcementData.bannerTitle || '');
                    setBannerSubtitle(announcementData.bannerSubtitle || '');
                    setBannerLink(announcementData.bannerLink || '');
                    setBannerImage(announcementData.bannerImage || '');
                    setIsBannerActive(!!announcementData.isBannerActive);
                    setDaysToLive(announcementData.daysToLive || 7);
                }
                setAiAssistantEnabled(Boolean(settingsData.aiAssistantEnabled));
            } catch (error) {
                // Error handled in UI if needed
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);

        // Auto-enable banner if title is provided but switch is off
        let finalIsBannerActive = isBannerActive;
        if (bannerTitle && !isBannerActive) {
            // Auto-enabling log removed
            finalIsBannerActive = true;
            setIsBannerActive(true);
        }

        const payload = {
            content,
            isActive,
            bannerTitle,
            bannerSubtitle,
            bannerLink,
            bannerImage,
            isBannerActive: finalIsBannerActive,
            daysToLive
        };

        // Save log removed

        try {
            const success = await saveAnnouncement(payload);
            
            if (success) {
                setMessage({ type: 'success', text: 'Đã lưu cấu hình thông báo thành công!' });
            } else {
                setMessage({ type: 'error', text: 'Lỗi khi lưu thông báo!' });
            }
        } catch (error) {
            console.error('Save announcement error:', error);
            setMessage({ type: 'error', text: 'Lỗi kết nối!' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSystemSettings = async () => {
        if (!authStore.username) {
            setMessage({ type: 'error', text: 'Không xác định được tài khoản admin.' });
            return;
        }

        setIsSavingSystem(true);
        setMessage(null);

        try {
            const success = await saveSystemSettings({
                actorUsername: authStore.username,
                aiAssistantEnabled,
            });

            if (success) {
                setMessage({ type: 'success', text: 'Đã lưu cài đặt Trợ lý AI thành công!' });
            } else {
                setMessage({ type: 'error', text: 'Lỗi khi lưu cài đặt Trợ lý AI!' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Lỗi kết nối khi lưu cài đặt hệ thống!' });
        } finally {
            setIsSavingSystem(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 bg-white rounded-lg shadow">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded mb-4"></div>
                    <div className="h-10 bg-gray-200 rounded w-24"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">📢</span>
                <h3 className="text-lg font-semibold text-gray-800">Quản lý Thông báo</h3>
            </div>

            {/* Section 1: Marquee Announcement (Chữ chạy) */}
            <div className="mb-8 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 mb-5">
                    <span className="text-xl">🏃‍♂️</span>
                    <h4 className="text-base font-semibold text-slate-800">Thông báo chữ chạy (Toàn App)</h4>
                </div>
                
                <div className="flex items-center gap-3 mb-5">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                    <span className={`font-medium ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {isActive ? 'Đang bật' : 'Đã tắt'}
                    </span>
                </div>

                <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nội dung thông báo
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Nhập nội dung thông báo chữ chạy..."
                        rows={2}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
                    />
                </div>
            </div>

            {/* Section 2: Banner Announcement (Hệ thống mới) */}
            <div className="mb-8 p-5 bg-indigo-50 rounded-xl border border-indigo-200">
                <div className="flex items-center gap-3 mb-5">
                    <span className="text-xl">✨</span>
                    <h4 className="text-base font-semibold text-indigo-900">Banner nổi (Chỉ hiện ở Trang Đăng Nhập)</h4>
                </div>

                <div className="flex items-center gap-3 mb-5">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isBannerActive}
                            onChange={(e) => setIsBannerActive(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                    <span className={`font-medium ${isBannerActive ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {isBannerActive ? 'Đang bật Banner' : 'Đã tắt Banner'}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-indigo-900 mb-1.5">Tiêu đề Banner</label>
                        <input
                            type="text"
                            value={bannerTitle}
                            onChange={(e) => setBannerTitle(e.target.value)}
                            className="w-full px-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="Vinh danh giáo viên xuất sắc..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-indigo-900 mb-1.5">URL Hình ảnh (Icon)</label>
                        <input
                            type="text"
                            value={bannerImage}
                            onChange={(e) => setBannerImage(e.target.value)}
                            className="w-full px-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="https://example.com/image.png"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-indigo-900 mb-1.5">Nội dung phụ (Subtitle)</label>
                        <input
                            type="text"
                            value={bannerSubtitle}
                            onChange={(e) => setBannerSubtitle(e.target.value)}
                            className="w-full px-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="Chúc mừng thầy cô đã hoàn thành xuất sắc nhiệm vụ..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-indigo-900 mb-1.5">Đường dẫn (Link)</label>
                        <input
                            type="text"
                            value={bannerLink}
                            onChange={(e) => setBannerLink(e.target.value)}
                            className="w-full px-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            placeholder="https://cdth.vercel.app"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-indigo-900 mb-1.5">Số ngày ghi nhớ đóng (Cookie)</label>
                        <input
                            type="number"
                            value={daysToLive}
                            onChange={(e) => setDaysToLive(parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {/* AI Assistant Settings */}
            <div className="mb-6 border-t border-gray-200 pt-6">
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">🤖</span>
                    <h4 className="text-base font-semibold text-gray-800">Cài đặt Trợ lý AI</h4>
                </div>
                <div className="flex items-center gap-3 mb-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={aiAssistantEnabled}
                            onChange={(e) => setAiAssistantEnabled(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                    <span className={`font-medium ${aiAssistantEnabled ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {aiAssistantEnabled ? 'Trợ lý AI: Đang bật' : 'Trợ lý AI: Đã tắt'}
                    </span>
                </div>
                <button
                    onClick={handleSaveSystemSettings}
                    disabled={isSavingSystem}
                    className={`px-6 py-2.5 rounded-lg font-medium text-white transition-all ${isSavingSystem
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-slate-700 hover:bg-slate-800 active:scale-95'
                        }`}
                >
                    {isSavingSystem ? 'Đang lưu cài đặt...' : '💾 Lưu cài đặt Trợ lý AI'}
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`mb-4 p-3 rounded-lg ${message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? '✅' : '❌'} {message.text}
                </div>
            )}

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={isSaving}
                className={`px-6 py-2.5 rounded-lg font-medium text-white transition-all ${isSaving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                    }`}
            >
                {isSaving ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Đang lưu...
                    </span>
                ) : (
                    '💾 Lưu cấu hình thông báo'
                )}
            </button>

            {/* Preview Marquee */}
            {content && isActive && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Xem trước Marquee:</p>
                    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg overflow-hidden">
                        <span className="marquee-preview">📢 {content}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnnouncementSettings;
