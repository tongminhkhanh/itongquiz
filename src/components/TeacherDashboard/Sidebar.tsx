import React, { useEffect, useMemo, useState } from 'react';
import {
    Award,
    BookText,
    ChevronRight,
    ClipboardList,
    FileText,
    Gift,
    Globe,
    GraduationCap,
    Home,
    LayoutTemplate,
    List,
    Megaphone,
    PanelLeftClose,
    PanelLeftOpen,
    PlusCircle,
    Radio,
    ScanSearch,
    Settings,
    Users,
} from 'lucide-react';
import { SCHOOL_NAME } from '../../config/constants';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../../stores/authStore';
import type { TeacherDashboardTab } from '../../stores/useTeacherDashboardUIStore';

export interface SidebarProps {
    activeTab: TeacherDashboardTab;
    setActiveTab: (tab: TeacherDashboardTab) => void;
    isGiftShopEnabled?: boolean;
    onLogout: () => void;
    isMobileOpen?: boolean;
    setIsMobileOpen?: (open: boolean) => void;
    isCollapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
}

type GroupKey = 'main' | 'ioe' | 'certificates' | 'account' | 'system';
type NavItem = { id: TeacherDashboardTab; label: string; icon: React.ReactNode };

const groupForTab = (tab: TeacherDashboardTab): GroupKey => {
    if (['ioe', 'ioe-manage', 'ioe-results'].includes(tab)) return 'ioe';
    if (['certificates', 'admin-templates'].includes(tab)) return 'certificates';
    if (tab === 'personal-settings') return 'account';
    if (['announcements', 'teachers', 'math-audit'].includes(tab)) return 'system';
    return 'main';
};

const Sidebar: React.FC<SidebarProps> = ({
    activeTab,
    setActiveTab,
    isGiftShopEnabled = false,
    onLogout,
    isMobileOpen = false,
    setIsMobileOpen = () => {},
    isCollapsed = false,
    onCollapsedChange = () => {},
}) => {
    const authStore = useAuthStore();
    const [openGroup, setOpenGroup] = useState<GroupKey>(() => groupForTab(activeTab));

    useEffect(() => {
        const nextGroup = groupForTab(activeTab);
        setOpenGroup(nextGroup);
        localStorage.setItem('itongquiz_dashboard_open_group', nextGroup);
    }, [activeTab]);

    // Keep prop referenced for the future account menu action.
    void onLogout;

    const navItems = useMemo<NavItem[]>(() => {
        const baseItems: NavItem[] = [
            { id: 'overview', label: 'Tổng quan', icon: <Home className="size-5" /> },
            { id: 'create', label: 'Tạo đề mới', icon: <PlusCircle className="size-5" /> },
            { id: 'manage', label: 'Đề kiểm tra', icon: <List className="size-5" /> },
            { id: 'results', label: 'Kết quả', icon: <FileText className="size-5" /> },
            { id: 'live-exam', label: 'Thi trực tiếp', icon: <Radio className="size-5" /> },
            { id: 'classes', label: 'Lớp học', icon: <GraduationCap className="size-5" /> },
            { id: 'assignments', label: 'Giao bài', icon: <ClipboardList className="size-5" /> },
            { id: 'homework', label: 'Bài tập tự luận', icon: <BookText className="size-5" /> },
        ];

        if (isGiftShopEnabled) {
            baseItems.push({ id: 'gift-shop', label: 'Tiệm tạp hóa', icon: <Gift className="size-5" /> });
        }

        return baseItems;
    }, [isGiftShopEnabled]);

    const ioeItems: NavItem[] = [
        { id: 'ioe-manage', label: 'IOE Quản lý', icon: <Globe className="size-5" /> },
        { id: 'ioe', label: 'IOE Tạo đề', icon: <Globe className="size-5" /> },
        { id: 'ioe-results', label: 'IOE Kết quả', icon: <Globe className="size-5" /> },
    ];

    const settingItems: NavItem[] = [
        { id: 'announcements', label: 'Thông báo', icon: <Megaphone className="size-5" /> },
        { id: 'teachers', label: 'Giáo viên', icon: <Users className="size-5" /> },
        { id: 'math-audit', label: 'Theo dõi lỗi công thức', icon: <ScanSearch className="size-5" /> },
    ];

    const accountItems: NavItem[] = [
        { id: 'personal-settings', label: 'Cài đặt cá nhân', icon: <Settings className="size-5" /> },
    ];

    const certificateItems: NavItem[] = [
        { id: 'certificates', label: 'Cấp chứng nhận', icon: <Award className="size-5" /> },
        ...(authStore.isAdmin
            ? [{ id: 'admin-templates' as TeacherDashboardTab, label: 'Mẫu chứng nhận', icon: <LayoutTemplate className="size-5" /> }]
            : []),
    ];

    const NavGroup = ({
        title,
        items,
        groupKey,
        adminOnly = false,
    }: {
        title: string;
        items: NavItem[];
        groupKey: GroupKey;
        adminOnly?: boolean;
    }) => {
        if (adminOnly && !authStore.isAdmin) return null;
        const isOpen = openGroup === groupKey;
        const groupId = `teacher-sidebar-${groupKey}`;

        return (
            <section
                aria-label={title}
                className={cn('mb-3', isCollapsed && 'lg:border-b lg:border-slate-200 lg:pb-2')}
            >
                <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={groupId}
                    onClick={() => setOpenGroup(groupKey)}
                    className={cn(
                        'flex h-10 w-full items-center justify-between rounded-xl px-5 text-left text-slate-500 transition-colors duration-150 hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                        isCollapsed && 'lg:hidden',
                    )}
                >
                    <span className="text-xs font-bold uppercase">{title}</span>
                    <ChevronRight
                        aria-hidden="true"
                        className={cn(
                            'size-4 transition-transform duration-150 motion-reduce:transition-none',
                            isOpen ? 'rotate-90 text-blue-600' : 'text-slate-400',
                        )}
                    />
                </button>

                <div
                    id={groupId}
                    className={cn(
                        'mt-1 space-y-1',
                        !isOpen && 'hidden',
                        isCollapsed && !isOpen && 'lg:block',
                    )}
                >
                    {items.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                aria-current={isActive ? 'page' : undefined}
                                aria-label={isCollapsed ? item.label : undefined}
                                title={isCollapsed ? item.label : undefined}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setIsMobileOpen(false);
                                }}
                                className={cn(
                                    'flex w-full items-center gap-3 rounded-r-xl border-l-4 px-5 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500',
                                    isActive
                                        ? 'border-blue-600 bg-blue-50 font-semibold text-blue-700 shadow-sm'
                                        : 'border-transparent text-slate-700 hover:bg-white hover:text-slate-900',
                                    isCollapsed && 'lg:justify-center lg:rounded-xl lg:border-l-0 lg:px-2',
                                )}
                            >
                                <span aria-hidden="true" className="shrink-0">{item.icon}</span>
                                <span className={cn('font-medium', isCollapsed && 'lg:sr-only')}>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </section>
        );
    };

    return (
        <>
            {isMobileOpen && (
                <button
                    type="button"
                    aria-label="Đóng menu điều hướng"
                    className="fixed inset-0 z-40 bg-black/30 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <aside
                aria-label="Điều hướng quản trị"
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex h-dvh w-72 -translate-x-full flex-col border-r border-slate-200 bg-slate-50 pb-20 transition-transform duration-200 ease-out motion-reduce:transition-none lg:translate-x-0 lg:pb-0',
                    isMobileOpen && 'translate-x-0',
                    isCollapsed ? 'lg:w-20' : 'lg:w-72',
                )}
            >
                <div
                    className={cn(
                        'relative flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-5',
                        isCollapsed && 'lg:justify-center lg:px-3',
                    )}
                >
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                            <img
                                src="/shool-logo1-removebg.png"
                                alt={`Logo ${SCHOOL_NAME}`}
                                className="size-full object-contain"
                            />
                        </div>
                        <span className={cn('truncate text-2xl font-black text-slate-900', isCollapsed && 'lg:hidden')}>
                            iTong<span className="text-blue-600">Quiz</span>
                        </span>
                    </div>

                    <button
                        type="button"
                        aria-label={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
                        aria-pressed={isCollapsed}
                        title={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
                        onClick={() => onCollapsedChange(!isCollapsed)}
                        className="absolute -right-3 top-1/2 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors duration-150 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:inline-flex"
                    >
                        {isCollapsed
                            ? <PanelLeftOpen aria-hidden="true" className="size-4" />
                            : <PanelLeftClose aria-hidden="true" className="size-4" />}
                    </button>
                </div>

                <nav className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-2 py-5">
                    <NavGroup title="Chính" items={navItems} groupKey="main" />
                    <NavGroup title="Tiếng Anh IOE" items={ioeItems} groupKey="ioe" adminOnly />
                    <NavGroup title="Chứng nhận" items={certificateItems} groupKey="certificates" />
                    <NavGroup title="Tài khoản" items={accountItems} groupKey="account" />
                    <NavGroup title="Quản trị hệ thống" items={settingItems} groupKey="system" adminOnly />
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;
