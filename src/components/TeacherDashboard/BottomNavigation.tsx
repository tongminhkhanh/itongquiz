import React from 'react';
import { Home, List, PlusCircle, GraduationCap, Menu } from 'lucide-react';

export interface BottomNavigationProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onToggleMenu: () => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, setActiveTab, onToggleMenu }) => {
    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-safe">
            <div className="flex justify-around items-center h-16 px-2">

                {/* Home */}
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'overview' ? 'text-orange-500' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <Home className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Tổng quan</span>
                </button>

                {/* Classes */}
                <button
                    onClick={() => setActiveTab('classes')}
                    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'classes' ? 'text-orange-500' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <GraduationCap className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Lớp học</span>
                </button>

                {/* Create (Center Floating-like Button) */}
                <button
                    onClick={() => setActiveTab('create')}
                    className="flex flex-col items-center justify-center w-full h-full relative"
                >
                    <div className="absolute -top-6 bg-white rounded-full p-1.5 shadow-sm border border-slate-100">
                        <div className="bg-orange-500 text-white rounded-full p-3 shadow-md border-2 border-white hover:bg-orange-600 hover:scale-105 transition-transform">
                            <PlusCircle className="w-6 h-6" />
                        </div>
                    </div>
                    <span className={`text-[10px] font-medium mt-7 ${activeTab === 'create' ? 'text-orange-500' : 'text-slate-500'}`}>Tạo đề</span>
                </button>

                {/* Manage Quizzes */}
                <button
                    onClick={() => setActiveTab('manage')}
                    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'manage' ? 'text-orange-500' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <List className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Sửa đề</span>
                </button>

                {/* Menu (Toggle Sidebar) */}
                <button
                    onClick={onToggleMenu}
                    className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <Menu className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Thêm</span>
                </button>

            </div>
        </div>
    );
};

export default BottomNavigation;
