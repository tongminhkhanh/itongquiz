import { Bell } from 'lucide-react';
import type React from 'react';
import type { TeacherDashboardTab } from '../../../stores/useTeacherDashboardUIStore';
import { DashboardSearchForm } from './DashboardSearchForm';
import { TeacherAccountMenu } from './TeacherAccountMenu';

interface TeacherDashboardHeaderProps {
  activeTab: TeacherDashboardTab;
  setActiveTab: (tab: TeacherDashboardTab) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onSearchSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  teacherDisplayName: string;
  teacherInitial: string;
  isAdmin: boolean;
  onLogout: () => void;
}

export const TeacherDashboardHeader = (props: TeacherDashboardHeaderProps) => (
  <header className="h-16 bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8">
    <div className="flex items-center" />
    <div className="flex items-center gap-2 md:gap-4">
      <DashboardSearchForm
        searchQuery={props.searchQuery}
        setSearchQuery={props.setSearchQuery}
        onSubmit={props.onSearchSubmit}
      />
      <button
        type="button"
        aria-label="Mở cài đặt thông báo"
        title="Thông báo"
        onClick={() => props.setActiveTab('announcements')}
        className={`hidden size-10 items-center justify-center rounded-full text-blue-900 transition-colors hover:bg-slate-100 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:inline-flex ${props.activeTab === 'announcements' ? 'bg-blue-50 text-blue-600' : ''}`}
      >
        <Bell aria-hidden="true" className="size-5" />
      </button>
      <TeacherAccountMenu
        displayName={props.teacherDisplayName}
        initial={props.teacherInitial}
        isAdmin={props.isAdmin}
        onLogout={props.onLogout}
      />
    </div>
  </header>
);
