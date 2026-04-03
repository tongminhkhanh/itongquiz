import React, { useMemo, useState } from 'react';
import {
    Home,
    FileText,
    List,
    Users,
    Globe,
    Megaphone,
    GraduationCap,
    ClipboardList,
    ChevronRight,
    PlusCircle,
    Gift,
} from 'lucide-react';
import { SCHOOL_NAME } from '../../config/constants';
import { useAuthStore } from '../../../stores/authStore';

export interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isGiftShopEnabled?: boolean;
    onLogout: () => void;
    isMobileOpen?: boolean;
    setIsMobileOpen?: (open: boolean) => void;
}

type GroupKey = 'main' | 'ioe' | 'system';

const Sidebar: React.FC<SidebarProps> = ({
    activeTab,
    setActiveTab,
    isGiftShopEnabled = false,
    onLogout,
    isMobileOpen = false,
    setIsMobileOpen = () => {},
}) => {
    const authStore = useAuthStore();
    const [openGroup, setOpenGroup] = useState<GroupKey>('main');

    // Keep prop referenced for future user-menu action
    void onLogout;

    const navItems = useMemo(() => {
        const baseItems: Array<{ id: string; label: string; icon: React.ReactNode }> = [
            { id: 'overview', label: 'Tong quan', icon: <Home className="w-5 h-5" /> },
            { id: 'create', label: 'Tao de moi', icon: <PlusCircle className="w-5 h-5" /> },
            { id: 'manage', label: 'De kiem tra', icon: <List className="w-5 h-5" /> },
            { id: 'results', label: 'Ket qua', icon: <FileText className="w-5 h-5" /> },
            { id: 'classes', label: 'Lop hoc', icon: <GraduationCap className="w-5 h-5" /> },
            { id: 'assignments', label: 'Giao bai', icon: <ClipboardList className="w-5 h-5" /> },
        ];

        if (isGiftShopEnabled) {
            baseItems.push({ id: 'gift-shop', label: 'Tiem tap hoa', icon: <Gift className="w-5 h-5" /> });
        }

        return baseItems;
    }, [isGiftShopEnabled]);

    const ioeItems = [
        { id: 'ioe-manage', label: 'IOE Quan ly', icon: <Globe className="w-5 h-5" /> },
        { id: 'ioe', label: 'IOE Tao de', icon: <Globe className="w-4 h-4 ml-1" /> },
        { id: 'ioe-results', label: 'IOE Ket qua', icon: <Globe className="w-4 h-4 ml-1" /> },
    ];

    const settingItems = [
        { id: 'announcements', label: 'Thong bao', icon: <Megaphone className="w-5 h-5" /> },
        { id: 'teachers', label: 'Giao vien', icon: <Users className="w-5 h-5" /> },
    ];

    const NavGroup = ({
        title,
        items,
        groupKey,
        adminOnly = false,
    }: {
        title: string;
        items: Array<{ id: string; label: string; icon: React.ReactNode }>;
        groupKey: GroupKey;
        adminOnly?: boolean;
    }) => {
        if (adminOnly && !authStore.isAdmin) return null;
        const isOpen = openGroup === groupKey;

        return (
            <div className="mb-3">
                <button
                    type="button"
                    onClick={() => setOpenGroup(groupKey)}
                    className="w-full px-5 h-10 flex items-center justify-between text-left rounded-xl hover:bg-white/80 transition-colors"
                >
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
                    <ChevronRight
                        className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90 text-blue-600' : 'text-slate-400'}`}
                    />
                </button>

                {isOpen && (
                    <div className="space-y-1 mt-1">
                        {items.map((item) => {
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id);
                                        setIsMobileOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-5 py-3 transition-all duration-200 border-l-4 rounded-r-xl ${
                                        isActive
                                            ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-sm'
                                            : 'border-transparent text-slate-700 hover:bg-white hover:text-slate-900'
                                    }`}
                                >
                                    {item.icon}
                                    <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {isMobileOpen && (
                <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setIsMobileOpen(false)} />
            )}

            <aside
                className={`fixed top-0 left-0 z-50 h-[calc(100vh-64px)] lg:h-full pb-20 lg:pb-0 w-64 bg-slate-50 border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out overflow-y-auto ${
                    isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
            >
                <div className="h-16 flex items-center px-5 border-b border-slate-200 shrink-0 bg-white/80 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center border border-slate-200 shadow-sm">
                            <img
                                src="/shool-logo1-removebg.png"
                                alt={`Logo ${SCHOOL_NAME}`}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <span className="text-2xl font-black tracking-tight text-slate-900">
                            iTong<span className="text-blue-600">Quiz</span>
                        </span>
                    </div>
                </div>

                <div className="flex-1 py-5 px-2 custom-scrollbar">
                    <NavGroup title="Chinh" items={navItems} groupKey="main" />
                    <NavGroup title="Tieng Anh IOE" items={ioeItems} groupKey="ioe" adminOnly={true} />
                    <NavGroup title="He thong" items={settingItems} groupKey="system" adminOnly={true} />
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
