import React, { useState } from 'react';
import {
    Home, FileText, List, Settings, Bot, Users,
    Globe, Megaphone, GraduationCap, ClipboardList,
    Menu, X, ChevronRight, LogOut, PlusCircle
} from 'lucide-react';
import { SCHOOL_NAME } from '../../config/constants';
import { useAuthStore } from '../../../stores/authStore';

export interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout }) => {
    const authStore = useAuthStore();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Sidebar items configuration
    const navItems = [
        { id: 'overview', label: 'Tổng quan', icon: <Home className="w-5 h-5" /> },
        { id: 'create', label: 'Tạo đề mới', icon: <PlusCircle className="w-5 h-5" /> },
        { id: 'manage', label: 'Đề kiểm tra', icon: <List className="w-5 h-5" /> },
        { id: 'results', label: 'Kết quả', icon: <FileText className="w-5 h-5" /> },
        { id: 'classes', label: 'Lớp học', icon: <GraduationCap className="w-5 h-5" /> },
        { id: 'assignments', label: 'Giao bài', icon: <ClipboardList className="w-5 h-5" /> },
    ];

    const ioeItems = [
        { id: 'ioe-manage', label: 'IOE Quản lý', icon: <Globe className="w-5 h-5" /> },
        { id: 'ioe', label: 'IOE Tạo đề', icon: <Globe className="w-4 h-4 ml-1" /> }, // sub item
        { id: 'ioe-results', label: 'IOE Kết quả', icon: <Globe className="w-4 h-4 ml-1" /> }, // sub item
    ];

    const settingItems = [
        { id: 'announcements', label: 'Thông báo', icon: <Megaphone className="w-5 h-5" /> },
        { id: 'teachers', label: 'Giáo viên', icon: <Users className="w-5 h-5" /> },
    ];

    const NavGroup = ({ title, items, adminOnly = false }: any) => {
        if (adminOnly && !authStore.isAdmin) return null;

        return (
            <div className="mb-6">
                {title && (
                    <h3 className="px-6 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {title}
                    </h3>
                )}
                <div className="space-y-1">
                    {items.map((item: any) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setIsMobileOpen(false); // Close mobile menu on click
                                }}
                                className={`w-full flex items-center gap-3 px-6 py-3 transition-colors duration-200 border-l-4 ${isActive
                                    ? 'bg-orange-500/10 text-orange-500 border-orange-500'
                                    : 'border-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                {item.icon}
                                <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Mobile Hamburger Button */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 z-50 flex items-center justify-between px-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-100 rounded-lg">
                        <Bot className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="font-bold text-white tracking-tight">iTongQuiz</span>
                </div>
                <button
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    className="p-2 text-slate-300 hover:text-white"
                >
                    {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Backdrop for Mobile */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                {/* Brand Area */}
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-xl">
                            <Bot className="w-6 h-6 text-orange-600" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">
                            iTongQuiz
                        </span>
                    </div>
                </div>

                {/* User Info (Desktop only, mobile has it in top bar or we can keep it here) */}
                <div className="px-6 py-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-orange-400 font-bold border border-slate-700">
                            {authStore.teacherName?.charAt(0)?.toUpperCase() || 'GV'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white">
                                {authStore.teacherName || 'Giáo viên'}
                            </span>
                            <span className="text-xs text-slate-400 truncate">
                                {SCHOOL_NAME}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto py-6 custom-scrollbar">
                    <NavGroup title="Chính" items={navItems} />
                    <NavGroup title="Tiếng Anh IOE" items={ioeItems} adminOnly={true} />
                    <NavGroup title="Hệ thống" items={settingItems} adminOnly={true} />
                </div>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Đăng xuất</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
