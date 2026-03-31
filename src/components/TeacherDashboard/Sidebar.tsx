import React, { useState } from 'react';
import {
    Home, FileText, List, Settings, Users,
    Globe, Megaphone, GraduationCap, ClipboardList,
    Menu, X, ChevronRight, LogOut, PlusCircle
} from 'lucide-react';
import { SCHOOL_NAME } from '../../config/constants';
import { useAuthStore } from '../../../stores/authStore';

export interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
    isMobileOpen?: boolean;
    setIsMobileOpen?: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout, isMobileOpen = false, setIsMobileOpen = () => { } }) => {
    const authStore = useAuthStore();

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
            {/* Backdrop for Mobile */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`fixed top-0 left-0 z-50 h-[calc(100vh-64px)] lg:h-full pb-20 lg:pb-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out overflow-y-auto ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                {/* Brand Area */}
                <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center">
                            <img
                                src="/school-logo.png"
                                alt={`Logo ${SCHOOL_NAME}`}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">
                            iTongQuiz
                        </span>
                    </div>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 py-6 custom-scrollbar">
                    <NavGroup title="Chính" items={navItems} />
                    <NavGroup title="Tiếng Anh IOE" items={ioeItems} adminOnly={true} />
                    <NavGroup title="Hệ thống" items={settingItems} adminOnly={true} />
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
